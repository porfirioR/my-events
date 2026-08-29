import { Inject, Injectable } from '@nestjs/common';
import { DASHBOARD_TOKENS } from '../../utility/constants/injection-tokens.const';
import { IDashboardAccessService } from '../../access/contract/dashboard';
import { DashboardSummaryModel } from '../models/dashboard/dashboard-summary.model';

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
      data.savingsGoals,
      data.travels,
      data.loans,
    );
  };
}
