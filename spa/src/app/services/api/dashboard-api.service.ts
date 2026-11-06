import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DashboardSummaryApiModel } from '../../models/api/dashboard/dashboard-summary-api.model';
import { NetWorthSummaryApiModel } from '../../models/api/dashboard/net-worth-summary-api.model';
import { MaturityCalendarApiModel } from '../../models/api/dashboard/maturity-calendar-api.model';
import { DebtsOverviewApiModel } from '../../models/api/dashboard/debts-overview-api.model';
import { FinancialHealthApiModel, FinancialSettingsApiModel, UpsertFinancialSettingsApiRequest } from '../../models/api/dashboard/financial-health-api.model';

@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private readonly section = 'dashboard';

  constructor(private readonly httpClient: HttpClient) {}

  getSummary = (): Observable<DashboardSummaryApiModel> =>
    this.httpClient.get<DashboardSummaryApiModel>(`${this.section}/summary`);

  getNetWorth = (): Observable<NetWorthSummaryApiModel> =>
    this.httpClient.get<NetWorthSummaryApiModel>(`${this.section}/net-worth`);

  // today = fecha local ('YYYY-MM-DD'): el servidor está en UTC
  getMaturities = (today: string): Observable<MaturityCalendarApiModel> =>
    this.httpClient.get<MaturityCalendarApiModel>(`${this.section}/maturities`, { params: { today } });

  getDebts = (today: string): Observable<DebtsOverviewApiModel> =>
    this.httpClient.get<DebtsOverviewApiModel>(`${this.section}/debts`, { params: { today } });

  getHealth = (today: string): Observable<FinancialHealthApiModel> =>
    this.httpClient.get<FinancialHealthApiModel>(`${this.section}/health`, { params: { today } });

  getFinancialSettings = (): Observable<FinancialSettingsApiModel> =>
    this.httpClient.get<FinancialSettingsApiModel>(`${this.section}/financial-settings`);

  upsertFinancialSettings = (request: UpsertFinancialSettingsApiRequest): Observable<FinancialSettingsApiModel> =>
    this.httpClient.put<FinancialSettingsApiModel>(`${this.section}/financial-settings`, request);
}