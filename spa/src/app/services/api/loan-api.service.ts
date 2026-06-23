import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  LoanApiModel,
  LoanInstallmentApiModel,
  LoanPaymentApiModel,
  LoanEntityTermApiModel,
  CreateLoanApiRequest,
  UpdateLoanApiRequest,
  PayLoanInstallmentApiRequest,
} from '../../models/api/loans';

@Injectable({ providedIn: 'root' })
export class LoanApiService {
  private readonly section = 'loans';

  constructor(private readonly httpClient: HttpClient) {}

  getEntityTerms = (): Observable<LoanEntityTermApiModel[]> =>
    this.httpClient.get<LoanEntityTermApiModel[]>(`${this.section}/entity-terms`);

  getAll = (): Observable<LoanApiModel[]> =>
    this.httpClient.get<LoanApiModel[]>(`${this.section}`);

  getById = (id: number): Observable<LoanApiModel> =>
    this.httpClient.get<LoanApiModel>(`${this.section}/${id}`);

  create = (request: CreateLoanApiRequest): Observable<LoanApiModel> =>
    this.httpClient.post<LoanApiModel>(`${this.section}`, request);

  update = (id: number, request: UpdateLoanApiRequest): Observable<LoanApiModel> =>
    this.httpClient.put<LoanApiModel>(`${this.section}/${id}`, request);

  delete = (id: number): Observable<void> =>
    this.httpClient.delete<void>(`${this.section}/${id}`);

  getInstallments = (loanId: number): Observable<LoanInstallmentApiModel[]> =>
    this.httpClient.get<LoanInstallmentApiModel[]>(`${this.section}/${loanId}/installments`);

  payInstallment = (loanId: number, installmentId: number, request: PayLoanInstallmentApiRequest): Observable<LoanPaymentApiModel> =>
    this.httpClient.post<LoanPaymentApiModel>(`${this.section}/${loanId}/installments/${installmentId}/pay`, request);

  skipInstallment = (loanId: number, installmentId: number): Observable<LoanInstallmentApiModel> =>
    this.httpClient.put<LoanInstallmentApiModel>(`${this.section}/${loanId}/installments/${installmentId}/skip`, {});

  getPayments = (loanId: number): Observable<LoanPaymentApiModel[]> =>
    this.httpClient.get<LoanPaymentApiModel[]>(`${this.section}/${loanId}/payments`);
}
