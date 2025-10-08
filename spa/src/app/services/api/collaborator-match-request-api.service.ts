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

  public createMatchRequest = (request: CreateMatchRequestRequest): Observable<MatchRequestResponseModel> =>
    this.httpClient.post<MatchRequestResponseModel>(`${this.section}`, request);

  public getReceivedRequests = (): Observable<ReceivedMatchRequestModel[]> =>
    this.httpClient.get<ReceivedMatchRequestModel[]>(`${this.section}/received`);

  public getSentRequests = (): Observable<CollaboratorMatchRequestModel[]> =>
    this.httpClient.get<CollaboratorMatchRequestModel[]>(`${this.section}/sent`);

  // ⭐ ACTUALIZADO: Aceptar sin collaboratorId (cuando ya tienes el email)
  public acceptMatchRequest = (requestId: number): Observable<CollaboratorMatchModel> =>
    this.httpClient.patch<CollaboratorMatchModel>(`${this.section}/${requestId}/accept`, {});

  // Aceptar con collaboratorId (cuando no tienes el email)
  public acceptMatchRequestWithCollaborator = (
    requestId: number, 
    collaboratorId: number
  ): Observable<CollaboratorMatchModel> =>
    this.httpClient.patch<CollaboratorMatchModel>(
      `${this.section}/${requestId}/accept`, 
      { collaboratorId }
    );

  public cancelMatchRequest = (requestId: number): Observable<MessageModel> =>
    this.httpClient.delete<MessageModel>(`${this.section}/${requestId}`);

  public getLoginNotifications = (): Observable<LoginNotificationsModel> =>
    this.httpClient.get<LoginNotificationsModel>('collaborators/notifications/login');
}