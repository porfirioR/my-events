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
import { ILoanAccessService } from '../../access/contract/loans';
import { IFinancialInstitutionAccessService } from '../../access/contract/financial-institutions';
import { NetWorthCalculatorHelper } from '../../utility/helpers';
import { DashboardSummaryModel } from '../models/dashboard/dashboard-summary.model';
import { NetWorthCurrencyModel, NetWorthInstitutionModel, NetWorthSummaryModel } from '../models/dashboard/net-worth-summary.model';

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
        institutionId: a.institutionId,
        currencyId: a.currencyId,
        balance: latestByAccount.get(a.id).balance,
      })),
      savings: savingsGoals.map(g => ({
        institutionId: g.institutionId,
        currencyId: g.currencyId,
        progressionTypeId: g.progressionTypeId,
        statusId: g.statusId,
        currentAmount: g.currentAmount,
      })),
      // En préstamos la entidad es loanEntityId (la columna no se renombró al generalizar a entidades financieras)
      loans: loans.map(l => ({
        institutionId: l.loanEntityId,
        currencyId: l.currencyId,
        direction: l.direction,
        statusId: l.statusId,
        currentBalance: l.currentBalance,
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
        )),
        c.byLiquidity,
        c.byType,
      )),
      lastSnapshotDate,
      activeAccounts.length - accountsWithBalance.length,
    );
  };

  private getLatestByAccount = (snapshots: AccountBalanceSnapshotAccessModel[]): Map<number, AccountBalanceSnapshotAccessModel> => {
    const latest = new Map<number, AccountBalanceSnapshotAccessModel>();
    snapshots.forEach(snapshot => {
      const current = latest.get(snapshot.accountId);
      if (!current || snapshot.snapshotDate > current.snapshotDate) latest.set(snapshot.accountId, snapshot);
    });
    return latest;
  };
}
