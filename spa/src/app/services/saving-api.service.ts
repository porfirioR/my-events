// src/app/services/api/savings-goal-api.service.ts

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { CreateSavingsGoalApiRequest, MessageModel, SavingsGoalApiModel, UpdateSavingsGoalApiRequest } from '../models/api';
import { AddInstallmentsApiRequest, CreateFreeFormDepositApiRequest, PayInstallmentApiRequest, SavingsDepositApiModel, SavingsGoalStatsApiModel, SavingsInstallmentApiModel } from '../models/api/savings';

@Injectable({
  providedIn: 'root'
})
export class SavingsGoalApiService {
  private readonly section: string = 'savings-goals';

  constructor(private readonly httpClient: HttpClient) {}

  // ==================== GOALS ====================

  public getAll = (): Observable<SavingsGoalApiModel[]> =>
    this.httpClient.get<SavingsGoalApiModel[]>(`${this.section}`);

  public getById = (id: number): Observable<SavingsGoalApiModel> =>
    this.httpClient.get<SavingsGoalApiModel>(`${this.section}/${id}`);

  public getByStatus = (statusId: number): Observable<SavingsGoalApiModel[]> =>
    this.httpClient.get<SavingsGoalApiModel[]>(`${this.section}/status/${statusId}`);

  public getStats = (): Observable<SavingsGoalStatsApiModel> =>
    this.httpClient.get<SavingsGoalStatsApiModel>(`${this.section}/stats`);

  public create = (request: CreateSavingsGoalApiRequest): Observable<SavingsGoalApiModel> =>
    this.httpClient.post<SavingsGoalApiModel>(`${this.section}`, request);

  public update = (id: number, request: UpdateSavingsGoalApiRequest): Observable<SavingsGoalApiModel> =>
    this.httpClient.put<SavingsGoalApiModel>(`${this.section}/${id}`, request);

  public delete = (id: number): Observable<MessageModel> =>
    this.httpClient.delete<MessageModel>(`${this.section}/${id}`);

  // ==================== INSTALLMENTS ====================

  public getInstallmentsByGoalId = (goalId: number): Observable<SavingsInstallmentApiModel[]> =>
    this.httpClient.get<SavingsInstallmentApiModel[]>(`${this.section}/${goalId}/installments`);

  public getPendingInstallments = (goalId: number): Observable<SavingsInstallmentApiModel[]> =>
    this.httpClient.get<SavingsInstallmentApiModel[]>(`${this.section}/${goalId}/installments/pending`);

  public payInstallment = (
    goalId: number,
    installmentId: number,
    request: PayInstallmentApiRequest
  ): Observable<SavingsDepositApiModel> =>
    this.httpClient.post<SavingsDepositApiModel>(
      `${this.section}/${goalId}/installments/${installmentId}/pay`,
      request
    );

  public skipInstallment = (goalId: number, installmentId: number): Observable<SavingsInstallmentApiModel> =>
    this.httpClient.put<SavingsInstallmentApiModel>(
      `${this.section}/${goalId}/installments/${installmentId}/skip`,
      {}
    );

  public addInstallments = (
    goalId: number,
    request: AddInstallmentsApiRequest
  ): Observable<SavingsInstallmentApiModel[]> =>
    this.httpClient.post<SavingsInstallmentApiModel[]>(
      `${this.section}/${goalId}/installments/add`,
      request
    );

  // ==================== DEPOSITS ====================

  public getDepositsByGoalId = (goalId: number): Observable<SavingsDepositApiModel[]> =>
    this.httpClient.get<SavingsDepositApiModel[]>(`${this.section}/${goalId}/deposits`);

  public createFreeFormDeposit = (
    goalId: number,
    request: CreateFreeFormDepositApiRequest
  ): Observable<SavingsDepositApiModel> =>
    this.httpClient.post<SavingsDepositApiModel>(
      `${this.section}/${goalId}/deposits/freeform`,
      request
    );

  public deleteDeposit = (depositId: number): Observable<MessageModel> =>
    this.httpClient.delete<MessageModel>(`${this.section}/deposits/${depositId}`);
}