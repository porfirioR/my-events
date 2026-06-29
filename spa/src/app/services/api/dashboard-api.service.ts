import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DashboardSummaryApiModel } from '../../models/api/dashboard/dashboard-summary-api.model';

@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private readonly section = 'dashboard';

  constructor(private readonly httpClient: HttpClient) {}

  getSummary = (): Observable<DashboardSummaryApiModel> =>
    this.httpClient.get<DashboardSummaryApiModel>(`${this.section}/summary`);
}