import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { 
  CreateMatchRequestApiRequest,
  MatchRequestResponseModel,
  ReceivedMatchRequestModel,
  CollaboratorMatchModel,
  CollaboratorMatchRequestModel,
  MessageModel
} from '../../models/api/collaborators';

@Injectable({
  providedIn: 'root'
})
export class CollaboratorMatchRequestApiService {
  private readonly section: string = 'collaborators/match-requests';

  constructor(private readonly httpClient: HttpClient) { }

  public createMatchRequest = (request: CreateMatchRequestApiRequest): Observable<MatchRequestResponseModel> =>
    this.httpClient.post<MatchRequestResponseModel>(`${this.section}`, request);

  public getReceivedRequests = (): Observable<ReceivedMatchRequestModel[]> =>
    this.httpClient.get<ReceivedMatchRequestModel[]>(`${this.section}/received`);

  public getSentRequests = (): Observable<CollaboratorMatchRequestModel[]> =>
    this.httpClient.get<CollaboratorMatchRequestModel[]>(`${this.section}/sent`);

  public acceptRequest = (id: number): Observable<CollaboratorMatchModel> =>
    this.httpClient.patch<CollaboratorMatchModel>(`${this.section}/${id}/accept`, {});

  public rejectRequest = (id: number): Observable<MessageModel> =>
    this.httpClient.patch<MessageModel>(`${this.section}/${id}/reject`, {});

  public cancelRequest = (id: number): Observable<MessageModel> =>
    this.httpClient.delete<MessageModel>(`${this.section}/${id}`);
}