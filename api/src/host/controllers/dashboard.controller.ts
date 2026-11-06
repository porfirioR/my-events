import { Body, Controller, Get, Inject, Put, Query, UseGuards } from '@nestjs/common';
import { PrivateEndpointGuard } from '../guards/private-endpoint.guard';
import { CurrentUserService } from '../services/current-user.service';
import { DashboardManagerService } from '../../manager/services/dashboard-manager.service';
import { DashboardSummaryModel } from '../../manager/models/dashboard/dashboard-summary.model';
import { NetWorthSummaryModel } from '../../manager/models/dashboard/net-worth-summary.model';
import { MaturityCalendarModel } from '../../manager/models/dashboard/maturity-calendar.model';
import { DebtsOverviewModel } from '../../manager/models/dashboard/debts-overview.model';
import { FinancialHealthModel, FinancialSettingsModel } from '../../manager/models/dashboard/financial-health.model';
import { UpsertFinancialSettingsRequest } from '../../manager/models/dashboard/upsert-financial-settings-request';
import { UpsertFinancialSettingsApiRequest } from '../models/dashboard/upsert-financial-settings-api-request';
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

  // today = fecha local del usuario ('YYYY-MM-DD'): el servidor está en UTC y de noche ya sería mañana
  @Get('maturities')
  async getMaturityCalendar(@Query('today') today?: string): Promise<MaturityCalendarModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    return this.dashboardManagerService.getMaturityCalendar(userId, this.toToday(today));
  }

  @Get('debts')
  async getDebtsOverview(@Query('today') today?: string): Promise<DebtsOverviewModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    return this.dashboardManagerService.getDebtsOverview(userId, this.toToday(today));
  }

  // Indicadores de salud financiera del mes de today (#228)
  @Get('health')
  async getFinancialHealth(@Query('today') today?: string): Promise<FinancialHealthModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    return this.dashboardManagerService.getFinancialHealth(userId, this.toToday(today));
  }

  // Ingreso neto, gasto esencial y umbrales cargados en el perfil
  @Get('financial-settings')
  async getFinancialSettings(): Promise<FinancialSettingsModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    return this.dashboardManagerService.getFinancialSettings(userId);
  }

  @Put('financial-settings')
  async upsertFinancialSettings(@Body() apiRequest: UpsertFinancialSettingsApiRequest): Promise<FinancialSettingsModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    const request = new UpsertFinancialSettingsRequest(
      userId,
      this.toNumberOrNull(apiRequest.monthlyNetIncome),
      this.toNumberOrNull(apiRequest.monthlyEssentialExpense),
      +apiRequest.cushionGreenMonths,
      +apiRequest.cushionYellowMonths,
      +apiRequest.savingsGreenPercentage,
      +apiRequest.savingsYellowPercentage,
      +apiRequest.debtGreenPercentage,
      +apiRequest.debtYellowPercentage,
    );
    return this.dashboardManagerService.upsertFinancialSettings(request);
  }

  private toNumberOrNull = (value: number | string | null | undefined): number | null =>
    value === null || value === undefined || value === '' ? null : +value;

  private toToday = (today?: string): string =>
    today && /^\d{4}-\d{2}-\d{2}$/.test(today) ? today : new Date().toISOString().slice(0, 10);
}