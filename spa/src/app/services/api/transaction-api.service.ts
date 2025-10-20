import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  TransactionApiModel,
  TransactionViewApiModel,
  BalanceApiModel,
  TransactionReimbursementApiModel,
  CreateTransactionApiRequest,
  AddReimbursementApiRequest,
} from '../../models/api/transactions';
import { MessageModel } from '../../models/api';

@Injectable({
  providedIn: 'root'
})
export class TransactionApiService {
  private readonly section: string = 'transactions';

  constructor(private readonly httpClient: HttpClient) {}

  // Obtener todas mis transacciones
  public getMyTransactions = (): Observable<TransactionViewApiModel[]> =>
    this.httpClient.get<TransactionViewApiModel[]>(`${this.section}`);

  // Obtener transacción por ID
  public getById = (id: number): Observable<TransactionApiModel> =>
    this.httpClient.get<TransactionApiModel>(`${this.section}/${id}`);

  // Crear transacción
  public createTransaction = (request: CreateTransactionApiRequest): Observable<TransactionApiModel> =>
    this.httpClient.post<TransactionApiModel>(this.section, request);

  // Agregar reintegro
  public addReimbursement = (transactionId: number, request: AddReimbursementApiRequest): Observable<TransactionReimbursementApiModel> =>
    this.httpClient.post<TransactionReimbursementApiModel>(`${this.section}/${transactionId}/reimbursements`, request);

  // Obtener balance con colaborador
  public getBalanceWithCollaborator = (collaboratorId: number): Observable<BalanceApiModel> =>
    this.httpClient.get<BalanceApiModel>(`${this.section}/balance/${collaboratorId}`);

  // Obtener todos los balances
  public getAllBalances = (): Observable<BalanceApiModel[]> =>
    this.httpClient.get<BalanceApiModel[]>(`${this.section}/balances/all`);

  // Eliminar transacción
  public deleteTransaction = (id: number): Observable<MessageModel> =>
    this.httpClient.delete<MessageModel>(`${this.section}/${id}`);
}