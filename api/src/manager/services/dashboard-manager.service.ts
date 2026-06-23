import { Injectable } from '@nestjs/common';
import { BaseAccessService, DbContextService } from '../../access/data/services';
import { TableEnum, DatabaseColumns } from '../../utility/enums';
import { ActiveGoalSummary, DashboardSummaryModel } from '../models/dashboard/dashboard-summary.model';

@Injectable()
export class DashboardManagerService extends BaseAccessService {
  constructor(dbContextService: DbContextService) {
    super(dbContextService);
  }

  public getSummary = async (userId: number): Promise<DashboardSummaryModel> => {
    const [
      collaboratorStats,
      transactionStats,
      savingsStats,
      travelStats,
      loanStats,
    ] = await Promise.all([
      this.getCollaboratorStats(userId),
      this.getTransactionStats(userId),
      this.getSavingsStats(userId),
      this.getTravelStats(userId),
      this.getLoanStats(userId),
    ]);

    return new DashboardSummaryModel(
      collaboratorStats,
      transactionStats,
      savingsStats,
      travelStats,
      loanStats,
    );
  };

  private getCollaboratorStats = async (userId: number) => {
    const [total, active] = await Promise.all([
      this.dbContext.from(TableEnum.Collaborators)
        .select(DatabaseColumns.EntityId, { count: 'exact', head: true })
        .eq(DatabaseColumns.UserId, userId),
      this.dbContext.from(TableEnum.Collaborators)
        .select(DatabaseColumns.EntityId, { count: 'exact', head: true })
        .eq(DatabaseColumns.UserId, userId)
        .eq(DatabaseColumns.IsActive, true),
    ]);
    const totalCount = total.count ?? 0;
    const activeCount = active.count ?? 0;
    return { total: totalCount, active: activeCount, inactive: totalCount - activeCount };
  };

  private getTransactionStats = async (userId: number) => {
    const [myCreated, unsettled, settled] = await Promise.all([
      this.dbContext.from(TableEnum.Transactions)
        .select(DatabaseColumns.EntityId, { count: 'exact', head: true })
        .eq(DatabaseColumns.UserId, userId),
      this.dbContext.from(TableEnum.Transactions)
        .select(DatabaseColumns.EntityId, { count: 'exact', head: true })
        .eq(DatabaseColumns.UserId, userId)
        .eq(DatabaseColumns.IsSettled, false),
      this.dbContext.from(TableEnum.Transactions)
        .select(DatabaseColumns.EntityId, { count: 'exact', head: true })
        .eq(DatabaseColumns.UserId, userId)
        .eq(DatabaseColumns.IsSettled, true),
    ]);
    const myCreatedCount = myCreated.count ?? 0;
    return {
      total: myCreatedCount,
      myCreated: myCreatedCount,
      unsettled: unsettled.count ?? 0,
      settled: settled.count ?? 0,
    };
  };

  private getSavingsStats = async (userId: number) => {
    const [total, active, completed, topActiveResult] = await Promise.all([
      this.dbContext.from(TableEnum.SavingsGoals)
        .select(DatabaseColumns.EntityId, { count: 'exact', head: true })
        .eq(DatabaseColumns.UserId, userId),
      this.dbContext.from(TableEnum.SavingsGoals)
        .select(DatabaseColumns.EntityId, { count: 'exact', head: true })
        .eq(DatabaseColumns.UserId, userId)
        .eq(DatabaseColumns.StatusId, 1),
      this.dbContext.from(TableEnum.SavingsGoals)
        .select(DatabaseColumns.EntityId, { count: 'exact', head: true })
        .eq(DatabaseColumns.UserId, userId)
        .eq(DatabaseColumns.StatusId, 2),
      this.dbContext.from(TableEnum.SavingsGoals)
        .select('id, name, currentamount, targetamount, currencyid, progressiontypeid, baseamount, numberofinstallments')
        .eq(DatabaseColumns.UserId, userId)
        .eq(DatabaseColumns.StatusId, 1)
        .order('dateupdated', { ascending: false })
        .limit(3),
    ]);

    const topActive: ActiveGoalSummary[] = (topActiveResult.data ?? []).map((g: any) =>
      new ActiveGoalSummary(
        g.id, g.name, g.currentamount, g.targetamount,
        g.currencyid, g.progressiontypeid, g.baseamount, g.numberofinstallments,
      )
    );

    return {
      total: total.count ?? 0,
      active: active.count ?? 0,
      completed: completed.count ?? 0,
      topActive,
    };
  };

  private getTravelStats = async (userId: number) => {
    const [total, active, finalized] = await Promise.all([
      this.dbContext.from(TableEnum.Travels)
        .select(DatabaseColumns.EntityId, { count: 'exact', head: true })
        .eq(DatabaseColumns.CreatedByUserId, userId),
      this.dbContext.from(TableEnum.Travels)
        .select(DatabaseColumns.EntityId, { count: 'exact', head: true })
        .eq(DatabaseColumns.CreatedByUserId, userId)
        .eq(DatabaseColumns.Status, 'Active'),
      this.dbContext.from(TableEnum.Travels)
        .select(DatabaseColumns.EntityId, { count: 'exact', head: true })
        .eq(DatabaseColumns.CreatedByUserId, userId)
        .eq(DatabaseColumns.Status, 'Finalized'),
    ]);
    return {
      total: total.count ?? 0,
      active: active.count ?? 0,
      finalized: finalized.count ?? 0,
    };
  };

  private getLoanStats = async (userId: number) => {
    const [total, active, completed] = await Promise.all([
      this.dbContext.from(TableEnum.Loans)
        .select(DatabaseColumns.EntityId, { count: 'exact', head: true })
        .eq(DatabaseColumns.UserId, userId),
      this.dbContext.from(TableEnum.Loans)
        .select(DatabaseColumns.EntityId, { count: 'exact', head: true })
        .eq(DatabaseColumns.UserId, userId)
        .eq(DatabaseColumns.StatusId, 1),
      this.dbContext.from(TableEnum.Loans)
        .select(DatabaseColumns.EntityId, { count: 'exact', head: true })
        .eq(DatabaseColumns.UserId, userId)
        .eq(DatabaseColumns.StatusId, 2),
    ]);
    return {
      total: total.count ?? 0,
      active: active.count ?? 0,
      completed: completed.count ?? 0,
    };
  };
}