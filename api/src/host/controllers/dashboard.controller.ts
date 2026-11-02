import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { PrivateEndpointGuard } from '../guards/private-endpoint.guard';
import { CurrentUserService } from '../services/current-user.service';
import { DashboardManagerService } from '../../manager/services/dashboard-manager.service';
import { DashboardSummaryModel } from '../../manager/models/dashboard/dashboard-summary.model';
import { NetWorthSummaryModel } from '../../manager/models/dashboard/net-worth-summary.model';
import { DASHBOARD_TOKENS } from '../../utility/constants/injection-tokens.const';

@Controller('dashboard')
@UseGuards(PrivateEndpointGuard)
export class DashboardController {
  constructor(
    private readonly currentUserService: CurrentUserService,
    @Inject(DASHBOARD_TOKENS.MANAGER_SERVICE)
    private readonly dashboardManagerService: DashboardManagerService,
  ) {}

  @Get('summary')
  async getSummary(): Promise<DashboardSummaryModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    return this.dashboardManagerService.getSummary(userId);
  }

  @Get('net-worth')
  async getNetWorth(): Promise<NetWorthSummaryModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    return this.dashboardManagerService.getNetWorth(userId);
  }
}