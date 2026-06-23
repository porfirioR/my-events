import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrivateEndpointGuard } from '../guards/private-endpoint.guard';
import { CurrentUserService } from '../services/current-user.service';
import { DashboardManagerService } from '../../manager/services/dashboard-manager.service';
import { DashboardSummaryModel } from '../../manager/models/dashboard/dashboard-summary.model';

@Controller('dashboard')
@UseGuards(PrivateEndpointGuard)
export class DashboardController {
  constructor(
    private readonly currentUserService: CurrentUserService,
    private readonly dashboardManagerService: DashboardManagerService,
  ) {}

  @Get('summary')
  async getSummary(): Promise<DashboardSummaryModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    return this.dashboardManagerService.getSummary(userId);
  }
}