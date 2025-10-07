// collaborator-match-request-api.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { 
  CreateMatchRequestRequest,
  MatchRequestResponseModel,
  ReceivedMatchRequestModel,
  CollaboratorMatchRequestModel,
  CollaboratorMatchModel,
  MessageModel,
  LoginNotificationsModel
} from '../../models/api/collaborators';

@Injectable({
  providedIn: 'root'
})
export class CollaboratorMatchRequestApiService {
  private readonly section: string = 'collaborators/match-requests';

  constructor(private readonly httpClient: HttpClient) { }

  // Crear solicitud de match
  public createMatchRequest = (request: CreateMatchRequestRequest): Observable<MatchRequestResponseModel> =>
    this.httpClient.post<MatchRequestResponseModel>(`${this.section}`, request);

  // Obtener solicitudes recibidas
  public getReceivedRequests = (): Observable<ReceivedMatchRequestModel[]> =>
    this.httpClient.get<ReceivedMatchRequestModel[]>(`${this.section}/received`);

  // Obtener solicitudes enviadas
  public getSentRequests = (): Observable<CollaboratorMatchRequestModel[]> =>
    this.httpClient.get<CollaboratorMatchRequestModel[]>(`${this.section}/sent`);

  // Aceptar solicitud
  public acceptMatchRequest = (requestId: number): Observable<CollaboratorMatchModel> =>
    this.httpClient.patch<CollaboratorMatchModel>(`${this.section}/${requestId}/accept`, {});

  // Cancelar solicitud enviada
  public cancelMatchRequest = (requestId: number): Observable<MessageModel> =>
    this.httpClient.delete<MessageModel>(`${this.section}/${requestId}`);

  // ⭐ NUEVO: Obtener notificaciones al hacer login
  public getLoginNotifications = (): Observable<LoginNotificationsModel> =>
    this.httpClient.get<LoginNotificationsModel>('collaborators/notifications/login');
}