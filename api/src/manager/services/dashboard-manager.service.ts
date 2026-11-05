import { Inject, Injectable } from '@nestjs/common';
import {
  ACCOUNT_TOKENS,
  DASHBOARD_TOKENS,
  FINANCIAL_INSTITUTION_TOKENS,
  LOAN_TOKENS,
  SAVINGS_TOKENS,
} from '../../utility/constants/injection-tokens.const';
import { IDashboardAccessService } from '../../access/contract/dashboard';
import { IAccountAccessService, IAccountBalanceSnapshotAccessService, AccountBalanceSnapshotAccessModel } from '../../access/contract/accounts';
import { ISavingsGoalAccessService } from '../../access/contract/savings';
import { ILoanAccessService, ILoanInstallmentAccessService, LoanAccessModel } from '../../access/contract/loans';
import { IFinancialInstitutionAccessService } from '../../access/contract/financial-institutions';
import { DebtsOverviewHelper, MaturityCalendarHelper, NetWorthCalculatorHelper } from '../../utility/helpers';
import { DashboardSummaryModel } from '../models/dashboard/dashboard-summary.model';
import { NetWorthCurrencyModel, NetWorthInstitutionModel, NetWorthItemModel, NetWorthSummaryModel } from '../models/dashboard/net-worth-summary.model';
import { MaturityCalendarModel, MaturityEventModel, MaturityMonthModel } from '../models/dashboard/maturity-calendar.model';
import { DebtsLoanModel, DebtsOverviewModel } from '../models/dashboard/debts-overview.model';

// Meses que muestra el calendario de vencimientos (desde el actual)
const MATURITY_CALENDAR_MONTHS = 12;

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
