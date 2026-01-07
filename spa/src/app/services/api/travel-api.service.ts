import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  TravelApiModel,
  TravelMemberApiModel,
  TravelOperationApiModel,
  TravelBalanceByCurrencyApiModel,
  PaymentMethodApiModel,
  CreateTravelApiRequest,
  UpdateTravelApiRequest,
  AddTravelMemberApiRequest,
  CreateTravelOperationApiRequest,
  UpdateTravelOperationApiRequest,
  RejectOperationApiRequest
} from '../../models/api/travels';
import { MessageModel } from '../../models/api';

@Injectable({
  providedIn: 'root'
})
export class TravelApiService {
  private readonly section: string = 'travels';

  constructor(private readonly httpClient: HttpClient) {}

  // ==================== PAYMENT METHODS ====================

  public getAllPaymentMethods = (): Observable<PaymentMethodApiModel[]> =>
    this.httpClient.get<PaymentMethodApiModel[]>(`${this.section}/payment-methods`);

  // ==================== TRAVELS ====================

  public getAllTravels = (): Observable<TravelApiModel[]> =>
    this.httpClient.get<TravelApiModel[]>(`${this.section}`);

  public getActiveTravels = (): Observable<TravelApiModel[]> =>
    this.httpClient.get<TravelApiModel[]>(`${this.section}/active`);

  public getFinalizedTravels = (): Observable<TravelApiModel[]> =>
    this.httpClient.get<TravelApiModel[]>(`${this.section}/finalized`);

  public getTravelById = (id: number): Observable<TravelApiModel> =>
    this.httpClient.get<TravelApiModel>(`${this.section}/${id}`);

  public createTravel = (request: CreateTravelApiRequest): Observable<TravelApiModel> =>
    this.httpClient.post<TravelApiModel>(`${this.section}`, request);

  public updateTravel = (id: number, request: UpdateTravelApiRequest): Observable<TravelApiModel> =>
    this.httpClient.put<TravelApiModel>(`${this.section}/${id}`, request);

  public finalizeTravel = (id: number): Observable<TravelApiModel> =>
    this.httpClient.post<TravelApiModel>(`${this.section}/${id}/finalize`, {});

  public deleteTravel = (id: number): Observable<MessageModel> =>
    this.httpClient.delete<MessageModel>(`${this.section}/${id}`);

  // ==================== TRAVEL MEMBERS ====================

  public getTravelMembers = (travelId: number): Observable<TravelMemberApiModel[]> =>
    this.httpClient.get<TravelMemberApiModel[]>(`${this.section}/${travelId}/members`);

  public addTravelMember = (travelId: number, request: AddTravelMemberApiRequest): Observable<TravelMemberApiModel> =>
    this.httpClient.post<TravelMemberApiModel>(`${this.section}/${travelId}/members`, request);

  public removeTravelMember = (memberId: number): Observable<MessageModel> =>
    this.httpClient.delete<MessageModel>(`${this.section}/members/${memberId}`);

  // ==================== TRAVEL OPERATIONS ====================

  public getTravelOperations = (travelId: number): Observable<TravelOperationApiModel[]> =>
    this.httpClient.get<TravelOperationApiModel[]>(`${this.section}/${travelId}/operations`);

  public getTravelOperationById = (operationId: number): Observable<TravelOperationApiModel> =>
    this.httpClient.get<TravelOperationApiModel>(`${this.section}/operations/${operationId}`);

  public createTravelOperation = (travelId: number, request: CreateTravelOperationApiRequest): Observable<TravelOperationApiModel> =>
    this.httpClient.post<TravelOperationApiModel>(`${this.section}/${travelId}/operations`, request);

  public updateTravelOperation = (travelId: number, operationId: number, request: UpdateTravelOperationApiRequest): Observable<TravelOperationApiModel> =>
    this.httpClient.put<TravelOperationApiModel>(`${this.section}/${travelId}/operations/${operationId}`, request);

  public deleteTravelOperation = (operationId: number): Observable<MessageModel> =>
    this.httpClient.delete<MessageModel>(`${this.section}/operations/${operationId}`);

  // ==================== OPERATION APPROVALS ====================

  public approveOperation = (operationId: number): Observable<TravelOperationApiModel> =>
    this.httpClient.post<TravelOperationApiModel>(`${this.section}/operations/${operationId}/approve`, {});

  public rejectOperation = (operationId: number, request: RejectOperationApiRequest): Observable<TravelOperationApiModel> =>
    this.httpClient.post<TravelOperationApiModel>(`${this.section}/operations/${operationId}/reject`, request);

  // ==================== TRAVEL BALANCES ====================

  public getTravelBalances = (travelId: number): Observable<TravelBalanceByCurrencyApiModel[]> =>
    this.httpClient.get<TravelBalanceByCurrencyApiModel[]>(`${this.section}/${travelId}/balances`);
}