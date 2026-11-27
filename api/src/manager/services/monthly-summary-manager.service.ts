import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserAccessService } from '../../access/data/services/user-access.service';
import { MailAccessService } from '../../access/mail';
import { IAccountAccessService } from '../../access/contract/accounts';
import { IImportedMovementAccessService, IMyMoneyCategoryMappingAccessService } from '../../access/contract/mymoney';
import { ACCOUNT_TOKENS, IMPORT_TOKENS } from '../../utility/constants/injection-tokens.const';
import { SPA_URL } from '../../utility/constants';
import { MaturityEventType, NetWorthLiquidity } from '../../utility/enums';
import { MonthlySummaryHelper, MonthlySummaryInput, SummaryLanguage, SummaryLoan } from '../../utility/helpers/monthly-summary.helper';
import { DashboardManagerService } from './dashboard-manager.service';
import { MyMoneyReconciliationManagerService } from './mymoney-reconciliation-manager.service';
import { MonthlySummaryResultModel, MonthlySummaryRunModel } from '../models/jobs/monthly-summary-run.model';
import { DebtsLoanModel } from '../models/dashboard/debts-overview.model';

// El resumen, como los indicadores, solo mira guaraníes por ahora
const SUMMARY_CURRENCY_ID = 4;
// My Money se considera importado hasta el final del mes anterior si hay movimientos de sus últimos días
const IMPORT_LAST_DAYS = 5;
// Estados de la conciliación que todavía falta confirmar
const PENDING_RECONCILIATION = ['matched', 'paidOnlyInMyMoney'];

// Resumen mensual por email (#263): lo dispara el workflow de GitHub el día 1 llamando a POST /jobs/monthly-summary.
// Usa los mismos managers que las pantallas para que los montos coincidan.
@Injectable()
export class MonthlySummaryManagerService {
  private readonly logger = new Logger(MonthlySummaryManagerService.name);

  constructor(
    private readonly userAccessService: UserAccessService,
    private readonly mailAccessService: MailAccessService,
    private readonly configService: ConfigService,
    private readonly dashboardManagerService: DashboardManagerService,
    private readonly reconciliationManagerService: MyMoneyReconciliationManagerService,

    @Inject(ACCOUNT_TOKENS.ACCOUNT_ACCESS_SERVICE)
    private readonly accountAccessService: IAccountAccessService,

    @Inject(IMPORT_TOKENS.IMPORTED_MOVEMENT_ACCESS_SERVICE)
    private readonly importedMovementAccessService: IImportedMovementAccessService,

    @Inject(IMPORT_TOKENS.CATEGORY_MAPPING_ACCESS_SERVICE)
    private readonly categoryMappingAccessService: IMyMoneyCategoryMappingAccessService,
  ) {}

  // Uno por uno (el pedido tiene un tiempo máximo en Azure): un error de un usuario no corta a los demás.
  // dryRun arma todo sin enviar, para probar.
  public sendAll = async (today: string, dryRun: boolean): Promise<MonthlySummaryRunModel> => {
    const users = (await this.userAccessService.getUsers()).filter(user => user.isEmailVerified);
    const results: MonthlySummaryResultModel[] = [];

    for (const user of users) {
      try {
        const settings = await this.dashboardManagerService.getFinancialSettings(user.id);
        if (!settings.monthlySummaryEmail) {
          results.push(new MonthlySummaryResultModel(user.id, 'optedOut'));
          continue;
        }
        const input = await this.buildInput(user.id, user.name, settings.language as SummaryLanguage, today);
        if (MonthlySummaryHelper.isEmpty(input)) {
          results.push(new MonthlySummaryResultModel(user.id, 'empty'));
          continue;
        }
        const email = MonthlySummaryHelper.render(input);
        if (!dryRun) await this.mailAccessService.sendHtmlEmail(user.email, email.subject, email.html, input.language);
        results.push(new MonthlySummaryResultModel(user.id, dryRun ? 'dryRun' : 'sent'));
      } catch (error) {
        this.logger.error(`Monthly summary failed for user ${user.id}: ${error instanceof Error ? error.message : error}`);
        results.push(new MonthlySummaryResultModel(user.id, 'failed'));
      }
    }

    return new MonthlySummaryRunModel(today, dryRun, results);
  };

  private buildInput = async (userId: number, userName: string, language: SummaryLanguage, today: string): Promise<MonthlySummaryInput> => {
    const month = today.substring(0, 7);
    const previousMonth = this.shiftMonth(month, -1);
    const [calendar, debts, netWorth, health, accounts, mappings] = await Promise.all([
      this.dashboardManagerService.getMaturityCalendar(userId, today),
      this.dashboardManagerService.getDebtsOverview(userId, today),
      this.dashboardManagerService.getNetWorth(userId),
      this.dashboardManagerService.getFinancialHealth(userId, today),
      this.accountAccessService.getAll(userId),
      this.categoryMappingAccessService.getAll(userId),
    ]);

    // Vencimientos de ahorros del mes; los cobros de préstamos van en su propia sección
    const isSummaryMaturity = (e: { currencyId: number; type: MaturityEventType }) =>
      e.currencyId === SUMMARY_CURRENCY_ID && e.type !== MaturityEventType.LentCollection;
    const toMaturity = (e: { date: string; type: MaturityEventType; name: string; amount: number }) =>
      ({ date: e.date, type: e.type, name: e.name, amount: Number(e.amount) });
    const currentMonth = calendar.months.find(m => m.month === month);

    // Préstamos con cuota en el mes o atrasadas
    const toLoans = (loans: DebtsLoanModel[]): SummaryLoan[] => loans
      .filter(loan => loan.currencyId === SUMMARY_CURRENCY_ID)
      .map(loan => ({
        name: loan.name,
        counterpartName: loan.counterpartName,
        dueDate: loan.nextDueDate?.startsWith(month) ? loan.nextDueDate : null,
        amount: Number(loan.nextAmount),
        overdueCount: loan.overdueCount,
        overdueAmount: Number(loan.overdueAmount),
      }))
      .filter(loan => loan.dueDate !== null || loan.overdueCount > 0);

    const guarani = netWorth.currencies.find(c => c.currencyId === SUMMARY_CURRENCY_ID);
    const liquidity = (type: NetWorthLiquidity) => Number(guarani?.byLiquidity.find(l => l.liquidity === type)?.amount ?? 0);

    // Pendientes: saldos del mes, My Money importado hasta fin del mes anterior y conciliación del mes anterior
    const hasActiveAccounts = accounts.some(account => account.isActive);
    const updateBalances = hasActiveAccounts && (netWorth.lastSnapshotDate === null || netWorth.lastSnapshotDate < `${month}-01`);
    const usesMyMoney = mappings.length > 0;
    let importMyMoney = false;
    let reconcileCount = 0;
    if (usesMyMoney) {
      const previousEnd = this.monthEnd(previousMonth);
      const lastDays = await this.importedMovementAccessService.getBetween(userId, this.shiftDays(previousEnd, -(IMPORT_LAST_DAYS - 1)), previousEnd);
      importMyMoney = lastDays.length === 0;
      const reconciliation = await this.reconciliationManagerService.getReconciliation(userId, previousMonth);
      reconcileCount = reconciliation.rows.filter(row => PENDING_RECONCILIATION.includes(row.status)).length;
    }

    return {
      month,
      previousMonth,
      language,
      userName,
      appUrl: this.configService.get<string>(SPA_URL) ?? '',
      maturities: (currentMonth?.events ?? []).filter(isSummaryMaturity).map(toMaturity),
      overdueMaturities: calendar.overdue.filter(isSummaryMaturity).map(toMaturity),
      installments: toLoans(debts.borrowed),
      collections: toLoans(debts.lent),
      netWorth: guarani ? {
        total: Number(guarani.total),
        immediate: liquidity(NetWorthLiquidity.Immediate),
        days: liquidity(NetWorthLiquidity.Days),
        locked: liquidity(NetWorthLiquidity.Locked),
        receivable: liquidity(NetWorthLiquidity.Receivable),
        liabilities: Number(guarani.liabilities),
      } : null,
      health: {
        cushionMonths: health.cushionMonths,
        savingsRate: health.savingsRate,
        debtRate: health.debtRate,
        source: health.source,
      },
      checklist: { updateBalances, importMyMoney, reconcileCount },
    };
  };

  private shiftMonth = (month: string, delta: number): string => {
    const [year, monthNumber] = month.split('-').map(Number);
    const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  };

  private monthEnd = (month: string): string => {
    const [year, monthNumber] = month.split('-').map(Number);
    return `${month}-${String(new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()).padStart(2, '0')}`;
  };

  private shiftDays = (date: string, days: number): string =>
    new Date(new Date(`${date}T00:00:00Z`).getTime() + days * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
}
