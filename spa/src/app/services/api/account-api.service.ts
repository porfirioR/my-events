import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AccountApiModel,
  AccountBalanceSnapshotApiModel,
  CreateAccountApiRequest,
  UpdateAccountApiRequest,
  UpsertAccountBalancesApiRequest,
} from '../../models/api/accounts';

@Injectable({ providedIn: 'root' })
export class AccountApiService {
  private readonly section = 'accounts';

  constructor(private readonly httpClient: HttpClient) {}

  getAll = (): Observable<AccountApiModel[]> =>
    this.httpClient.get<AccountApiModel[]>(`${this.section}`);

  getById = (id: number): Observable<AccountApiModel> =>
    this.httpClient.get<AccountApiModel>(`${this.section}/${id}`);

  create = (request: CreateAccountApiRequest): Observable<AccountApiModel> =>
    this.httpClient.post<AccountApiModel>(`${this.section}`, request);

  update = (id: number, request: UpdateAccountApiRequest): Observable<AccountApiModel> =>
    this.httpClient.put<AccountApiModel>(`${this.section}/${id}`, request);

  delete = (id: number): Observable<void> =>
    this.httpClient.delete<void>(`${this.section}/${id}`);

  // ==================== BALANCE SNAPSHOTS ====================

  // from/to: 'YYYY-MM' (opcionales)
  getBalances = (from?: string, to?: string): Observable<AccountBalanceSnapshotApiModel[]> => {
    const params: Record<string, string> = {};
    if (from) params['from'] = from;
    if (to) params['to'] = to;
    return this.httpClient.get<AccountBalanceSnapshotApiModel[]>(`${this.section}/balances`, { params });
  };

  upsertBalances = (request: UpsertAccountBalancesApiRequest): Observable<AccountBalanceSnapshotApiModel[]> =>
    this.httpClient.put<AccountBalanceSnapshotApiModel[]>(`${this.section}/balances`, request);
}
