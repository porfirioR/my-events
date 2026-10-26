import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateFinancialInstitutionApiRequest,
  FinancialInstitutionApiModel,
  UpdateFinancialInstitutionApiRequest,
} from '../../models/api/financial-institutions';

@Injectable({ providedIn: 'root' })
export class FinancialInstitutionApiService {
  private readonly section = 'financial-institutions';

  constructor(private readonly httpClient: HttpClient) {}

  getAll = (): Observable<FinancialInstitutionApiModel[]> =>
    this.httpClient.get<FinancialInstitutionApiModel[]>(`${this.section}`);

  create = (request: CreateFinancialInstitutionApiRequest): Observable<FinancialInstitutionApiModel> =>
    this.httpClient.post<FinancialInstitutionApiModel>(`${this.section}`, request);

  update = (id: number, request: UpdateFinancialInstitutionApiRequest): Observable<FinancialInstitutionApiModel> =>
    this.httpClient.put<FinancialInstitutionApiModel>(`${this.section}/${id}`, request);

  delete = (id: number): Observable<void> =>
    this.httpClient.delete<void>(`${this.section}/${id}`);
}
