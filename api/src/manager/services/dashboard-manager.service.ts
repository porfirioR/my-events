import { Inject, Injectable } from '@nestjs/common';
import { DASHBOARD_TOKENS } from '../../utility/constants/injection-tokens.const';
import { IDashboardAccessService } from '../../access/contract/dashboard';
import { ActiveGoalSummary, DashboardSummaryModel } from '../models/dashboard/dashboard-summary.model';

@Injectable()
export class DashboardManagerService {
  constructor(
    @Inject(DASHBOARD_TOKENS.ACCESS_SERVICE)
    private readonly dashboardAccessService: IDashboardAccessService,
  ) {}

  public getSummary = async (userId: number): Promise<DashboardSummaryModel> => {
    const data = await this.dashboardAccessService.getSummary(userId);
    return new DashboardSummaryModel(
      data.collaborators,
      data.transactions,
      {
        ...data.savingsGoals,
        topActive: data.savingsGoals.topActive.map(g =>
          new ActiveGoalSummary(g.id, g.name, g.currentAmount, g.targetAmount, g.currencyId, g.progressionTypeId, g.baseAmount, g.numberOfInstallments)
        ),
      },
      data.travels,
      data.loans,
    );
  };
}
