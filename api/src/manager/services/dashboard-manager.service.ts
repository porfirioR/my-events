import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  ACCOUNT_TOKENS,
  DASHBOARD_TOKENS,
  FINANCIAL_INSTITUTION_TOKENS,
  LOAN_TOKENS,
  SAVINGS_TOKENS,
} from '../../utility/constants/injection-tokens.const';
import { IDashboardAccessService } from '../../access/contract/dashboard';
import { IAccountAccessService, IAccountBalanceSnapshotAccessService, AccountBalanceSnapshotAccessModel } from '../../access/contract/accounts';
import { ISavingsGoalAccessService, ISavingsInstallmentAccessService } from '../../access/contract/savings';
import { IUserFinancialSettingsAccessService, UpsertUserFinancialSettingsAccessRequest, UserFinancialSettingsAccessModel } from '../../access/contract/financial-settings';
import { ILoanAccessService, ILoanInstallmentAccessService, LoanAccessModel } from '../../access/contract/loans';
import { IFinancialInstitutionAccessService } from '../../access/contract/financial-institutions';
import { DebtsOverviewHelper, FinancialHealthHelper, MaturityCalendarHelper, NetWorthCalculatorHelper } from '../../utility/helpers';
import { LoanDirection, NetWorthLiquidity } from '../../utility/enums';
import { DashboardSummaryModel } from '../models/dashboard/dashboard-summary.model';
import { NetWorthCurrencyModel, NetWorthInstitutionModel, NetWorthItemModel, NetWorthSummaryModel } from '../models/dashboard/net-worth-summary.model';
import { MaturityCalendarModel, MaturityEventModel, MaturityMonthModel } from '../models/dashboard/maturity-calendar.model';
import { DebtsLoanModel, DebtsOverviewModel } from '../models/dashboard/debts-overview.model';
import { FinancialHealthModel, FinancialSettingsModel, HealthIndicatorModel, HealthThresholdsModel } from '../models/dashboard/financial-health.model';
import { UpsertFinancialSettingsRequest } from '../models/dashboard/upsert-financial-settings-request';

// Meses que muestra el calendario de vencimientos (desde el actual)
const MATURITY_CALENDAR_MONTHS = 12;

// Los indicadores de salud solo miran guaraníes por ahora (#228)
const HEALTH_CURRENCY_ID = 4;
const DEFAULT_THRESHOLDS = new HealthThresholdsModel(6, 3, 20, 10, 30, 40);
// Estados que no comprometen cuotas: ahorro cancelado (4) o ya cobrado (5)
const SAVINGS_STATUSES_CLOSED = [4, 5];

@Injectable()
export class DashboardManagerService {
  constructor(
    @Inject(DASHBOARD_TOKENS.ACCESS_SERVICE)
    private readonly dashboardAccessService: IDashboardAccessService,

    @Inject(ACCOUNT_TOKENS.ACCOUNT_ACCESS_SERVICE)
    private readonly accountAccessService: IAccountAccessService,

    @Inject(ACCOUNT_TOKENS.BALANCE_SNAPSHOT_ACCESS_SERVICE)
    private readonly balanceSnapshotAccessService: IAccountBalanceSnapshotAccessService,

    @Inject(SAVINGS_TOKENS.GOAL_ACCESS_SERVICE)
    private readonly savingsGoalAccessService: ISavingsGoalAccessService,

    @Inject(SAVINGS_TOKENS.INSTALLMENT_ACCESS_SERVICE)
    private readonly savingsInstallmentAccessService: ISavingsInstallmentAccessService,

    @Inject(DASHBOARD_TOKENS.FINANCIAL_SETTINGS_ACCESS_SERVICE)
    private readonly financialSettingsAccessService: IUserFinancialSettingsAccessService,

    @Inject(LOAN_TOKENS.LOAN_ACCESS_SERVICE)
    private readonly loanAccessService: ILoanAccessService,

    @Inject(LOAN_TOKENS.INSTALLMENT_ACCESS_SERVICE)
    private readonly loanInstallmentAccessService: ILoanInstallmentAccessService,

    @Inject(FINANCIAL_INSTITUTION_TOKENS.ACCESS_SERVICE)
    private readonly financialInstitutionAccessService: IFinancialInstitutionAccessService,
  ) {}

  public getSummary = async (userId: number): Promise<DashboardSummaryModel> => {
    const data = await this.dashboardAccessService.getSummary(userId);
    return new DashboardSummaryModel(
      data.collaborators,
      data.transactions,
      data.savingsGoals,
      data.travels,
      data.loans,
      data.accounts,
    );
  };

  // Patrimonio a partir de saldos: último snapshot de cada cuenta activa + ahorros + préstamos pendientes
  public getNetWorth = async (userId: number): Promise<NetWorthSummaryModel> => {
    const [accounts, savingsGoals, loans, institutions] = await Promise.all([
      this.accountAccessService.getAll(userId),
      this.savingsGoalAccessService.getAll(userId),
      this.loanAccessService.getAll(userId),
      this.financialInstitutionAccessService.getAll(userId),
    ]);

    const activeAccounts = accounts.filter(a => a.isActive);
    const snapshots = await this.balanceSnapshotAccessService.getByAccountIds(activeAccounts.map(a => a.id), null, null);
    const latestByAccount = this.getLatestByAccount(snapshots);
    const accountsWithBalance = activeAccounts.filter(a => latestByAccount.has(a.id));

    const currencies = NetWorthCalculatorHelper.calculate({
      accounts: accountsWithBalance.map(a => ({
        id: a.id,
        name: a.name,
        institutionId: a.institutionId,
        currencyId: a.currencyId,
        balance: latestByAccount.get(a.id).balance,
      })),
      savings: savingsGoals.map(g => ({
        id: g.id,
        name: g.name,
        institutionId: g.institutionId,
        currencyId: g.currencyId,
        progressionTypeId: g.progressionTypeId,
        statusId: g.statusId,
        currentAmount: g.currentAmount,
        expectedEndDate: this.toDateKey(g.expectedEndDate),
        payoutDate: this.toDateKey(g.payoutDate),
      })),
      // En préstamos la entidad es loanEntityId (la columna no se renombró al generalizar a entidades financieras)
      loans: loans.map(l => ({
        id: l.id,
        name: l.name,
        institutionId: l.loanEntityId,
        currencyId: l.currencyId,
        direction: l.direction,
        statusId: l.statusId,
        currentBalance: l.currentBalance,
        expectedEndDate: this.toDateKey(l.expectedEndDate),
      })),
    });

    const institutionNames = new Map(institutions.map(i => [i.id, i.name]));
    const lastSnapshotDate = [...latestByAccount.values()]
      .map(s => s.snapshotDate)
      .sort()
      .at(-1) ?? null;

    return new NetWorthSummaryModel(
      currencies.map(c => new NetWorthCurrencyModel(
        c.currencyId,
        c.total,
        c.assets,
        c.liabilities,
        c.byInstitution.map(i => new NetWorthInstitutionModel(
          i.institutionId,
          i.institutionId === null ? null : institutionNames.get(i.institutionId) ?? null,
          i.assets,
          i.liabilities,
          i.total,
          i.byLiquidity,
          i.items.map(x => new NetWorthItemModel(x.type, x.sourceId, x.name, x.liquidity, x.amount, x.availableDate)),
        )),
        c.byLiquidity,
        c.byType,
      )),
      lastSnapshotDate,
      activeAccounts.length - accountsWithBalance.length,
    );
  };

  // Lo que vence o se cobra en los próximos meses; today = YYYY-MM-DD del usuario
  public getMaturityCalendar = async (userId: number, today: string): Promise<MaturityCalendarModel> => {
    const [savingsGoals, loans, institutionNames] = await Promise.all([
      this.savingsGoalAccessService.getAll(userId),
      this.loanAccessService.getAll(userId),
      this.getInstitutionNames(userId),
    ]);
    const installments = await this.getPendingInstallments(loans);

    const calendar = MaturityCalendarHelper.build({
      savings: savingsGoals.map(g => ({
        id: g.id,
        name: g.name,
        institutionId: g.institutionId,
        currencyId: g.currencyId,
        progressionTypeId: g.progressionTypeId,
        statusId: g.statusId,
        targetAmount: g.targetAmount,
        currentAmount: g.currentAmount,
        expectedEndDate: this.toDateKey(g.expectedEndDate),
        payoutDate: this.toDateKey(g.payoutDate),
        plannedDestination: g.plannedDestination,
      })),
      loans: loans.map(l => ({
        id: l.id,
        name: l.name,
        institutionId: l.loanEntityId,
        lenderCustomName: l.lenderCustomName,
        currencyId: l.currencyId,
        direction: l.direction,
        statusId: l.statusId,
        expectedEndDate: this.toDateKey(l.expectedEndDate),
        installmentAmount: l.actualInstallmentAmount,
      })),
      installments: installments.map(i => ({ loanId: i.loanId, dueDate: this.toDateKey(i.dueDate), totalAmount: i.totalAmount })),
    }, today, MATURITY_CALENDAR_MONTHS);

    const toModel = (e: typeof calendar.overdue[number]) => {
      const institutionName = e.institutionId === null ? null : institutionNames.get(e.institutionId) ?? null;
      return new MaturityEventModel(
        e.type, e.date, e.currencyId, e.amount, e.sourceId, e.name, e.institutionId, institutionName,
        e.lenderCustomName ?? institutionName, e.plannedDestination,
      );
    };
    return new MaturityCalendarModel(
      calendar.months.map(m => new MaturityMonthModel(m.month, m.totals, m.events.map(toModel))),
      calendar.overdue.map(toModel),
    );
  };

  // Lo que debo y lo que me deben, con cuotas restantes, próximo vencimiento y atrasos
  public getDebtsOverview = async (userId: number, today: string): Promise<DebtsOverviewModel> => {
    const [loans, institutionNames] = await Promise.all([
      this.loanAccessService.getAll(userId),
      this.getInstitutionNames(userId),
    ]);
    const installments = await this.getPendingInstallments(loans);

    const overview = DebtsOverviewHelper.build({
      loans: loans.map(l => ({
        id: l.id,
        name: l.name,
        institutionId: l.loanEntityId,
        lenderCustomName: l.lenderCustomName,
        currencyId: l.currencyId,
        direction: l.direction,
        statusId: l.statusId,
        currentBalance: l.currentBalance,
        expectedEndDate: this.toDateKey(l.expectedEndDate),
        installmentAmount: l.actualInstallmentAmount,
      })),
      installments: installments.map(i => ({ loanId: i.loanId, dueDate: this.toDateKey(i.dueDate), totalAmount: i.totalAmount })),
    }, today);

    const toModel = (l: typeof overview.borrowed[number]) => {
      const institutionName = institutionNames.get(l.institutionId) ?? null;
      return new DebtsLoanModel(
        l.loanId, l.name, l.institutionId, institutionName, l.lenderCustomName ?? institutionName, l.currencyId,
        l.currentBalance, l.remainingInstallments, l.nextDueDate, l.nextAmount, l.expectedEndDate, l.overdueCount, l.overdueAmount,
      );
    };
    return new DebtsOverviewModel(overview.borrowed.map(toModel), overview.lent.map(toModel), overview.totals);
  };

  // ==================== SALUD FINANCIERA (#228) ====================

  public getFinancialSettings = async (userId: number): Promise<FinancialSettingsModel> =>
    this.toSettingsModel(await this.financialSettingsAccessService.getByUserId(userId));

  public upsertFinancialSettings = async (request: UpsertFinancialSettingsRequest): Promise<FinancialSettingsModel> => {
    const amount = (value: number | null, name: string): number | null => {
      if (value === null) return null;
      if (!Number.isInteger(value) || value <= 0) throw new BadRequestException(`${name} must be a positive whole amount`);
      return value;
    };
    const threshold = (value: number, name: string): number => {
      if (!Number.isFinite(value) || value < 0 || value > 999) throw new BadRequestException(`Invalid ${name}`);
      return value;
    };
    const t = new HealthThresholdsModel(
      threshold(request.cushionGreenMonths, 'cushionGreenMonths'),
      threshold(request.cushionYellowMonths, 'cushionYellowMonths'),
      threshold(request.savingsGreenPercentage, 'savingsGreenPercentage'),
      threshold(request.savingsYellowPercentage, 'savingsYellowPercentage'),
      threshold(request.debtGreenPercentage, 'debtGreenPercentage'),
      threshold(request.debtYellowPercentage, 'debtYellowPercentage'),
    );
    if (t.cushionGreenMonths < t.cushionYellowMonths) throw new BadRequestException('Cushion green must be at least the yellow threshold');
    if (t.savingsGreenPercentage < t.savingsYellowPercentage) throw new BadRequestException('Savings green must be at least the yellow threshold');
    if (t.debtGreenPercentage > t.debtYellowPercentage) throw new BadRequestException('Debt green must be at most the yellow threshold');

    const saved = await this.financialSettingsAccessService.upsert(new UpsertUserFinancialSettingsAccessRequest(
      request.userId,
      HEALTH_CURRENCY_ID,
      amount(request.monthlyNetIncome, 'monthlyNetIncome'),
      amount(request.monthlyEssentialExpense, 'monthlyEssentialExpense'),
      t.cushionGreenMonths, t.cushionYellowMonths,
      t.savingsGreenPercentage, t.savingsYellowPercentage,
      t.debtGreenPercentage, t.debtYellowPercentage,
    ));
    return this.toSettingsModel(saved);
  };

  /**
   * Meses de colchón, % de ahorro y % de cuotas del mes de today ('YYYY-MM-DD').
   * - Líquido inmediato: el mismo del patrimonio (cuentas + ahorros de retiro inmediato)
   * - Aportes fijos: cuotas de ahorros que vencen en el mes, pagadas o no
   * - Cuotas: de préstamos recibidos que vencen en el mes, pagadas o no
   */
  public getFinancialHealth = async (userId: number, today: string): Promise<FinancialHealthModel> => {
    const { from, to } = FinancialHealthHelper.monthRange(today);
    const [netWorth, settings, savingsGoals, loans] = await Promise.all([
      this.getNetWorth(userId),
      this.getFinancialSettings(userId),
      this.savingsGoalAccessService.getAll(userId),
      this.loanAccessService.getAll(userId),
    ]);

    const liquidImmediate = Number(netWorth.currencies
      .find(c => c.currencyId === HEALTH_CURRENCY_ID)?.byLiquidity
      .find(l => l.liquidity === NetWorthLiquidity.Immediate)?.amount ?? 0);

    const goalIds = savingsGoals
      .filter(g => g.currencyId === HEALTH_CURRENCY_ID && !SAVINGS_STATUSES_CLOSED.includes(g.statusId))
      .map(g => g.id);
    const borrowedLoanIds = loans
      .filter(l => l.currencyId === HEALTH_CURRENCY_ID && l.direction !== LoanDirection.Lent)
      .map(l => l.id);
    const [savingsInstallments, loanInstallments] = await Promise.all([
      this.savingsInstallmentAccessService.getDueBetweenByGoalIds(goalIds, from, to),
      this.loanInstallmentAccessService.getDueBetweenByLoanIds(borrowedLoanIds, from, to),
    ]);
    const monthlySavingsContributions = savingsInstallments.reduce((sum, i) => sum + Number(i.amount), 0);
    const monthlyLoanInstallments = loanInstallments.reduce((sum, i) => sum + Number(i.totalAmount), 0);

    const health = FinancialHealthHelper.calculate({
      liquidImmediate,
      monthlySavingsContributions,
      monthlyLoanInstallments,
      monthlyNetIncome: settings.monthlyNetIncome,
      monthlyEssentialExpense: settings.monthlyEssentialExpense,
      thresholds: settings.thresholds,
    });

    return new FinancialHealthModel(
      HEALTH_CURRENCY_ID,
      liquidImmediate,
      monthlySavingsContributions,
      monthlyLoanInstallments,
      settings.monthlyNetIncome,
      settings.monthlyEssentialExpense,
      new HealthIndicatorModel(health.cushionMonths.value, health.cushionMonths.status),
      new HealthIndicatorModel(health.savingsRate.value, health.savingsRate.status),
      new HealthIndicatorModel(health.debtRate.value, health.debtRate.status),
      settings.thresholds,
    );
  };

  private toSettingsModel = (s: UserFinancialSettingsAccessModel | null): FinancialSettingsModel =>
    s === null
      ? new FinancialSettingsModel(HEALTH_CURRENCY_ID, null, null, DEFAULT_THRESHOLDS)
      : new FinancialSettingsModel(
        s.currencyId,
        s.monthlyNetIncome,
        s.monthlyEssentialExpense,
        new HealthThresholdsModel(
          s.cushionGreenMonths, s.cushionYellowMonths,
          s.savingsGreenPercentage, s.savingsYellowPercentage,
          s.debtGreenPercentage, s.debtYellowPercentage,
        ),
      );

  // Solo de préstamos en curso: los saldados o cancelados no tienen cuotas que mirar
  private getPendingInstallments = (loans: LoanAccessModel[]) =>
    this.loanInstallmentAccessService.getPendingByLoanIds(loans.filter(l => l.statusId === 1 || l.statusId === 3).map(l => l.id));

  private getInstitutionNames = async (userId: number): Promise<Map<number, string>> => {
    const institutions = await this.financialInstitutionAccessService.getAll(userId);
    return new Map(institutions.map(i => [i.id, i.name]));
  };

  // Date de la base (medianoche UTC) a YYYY-MM-DD
  private toDateKey = (date: Date | null): string | null => (date ? new Date(date).toISOString().slice(0, 10) : null);

  private getLatestByAccount = (snapshots: AccountBalanceSnapshotAccessModel[]): Map<number, AccountBalanceSnapshotAccessModel> => {
    const latest = new Map<number, AccountBalanceSnapshotAccessModel>();
    snapshots.forEach(snapshot => {
      const current = latest.get(snapshot.accountId);
      if (!current || snapshot.snapshotDate > current.snapshotDate) latest.set(snapshot.accountId, snapshot);
    });
    return latest;
  };
}
