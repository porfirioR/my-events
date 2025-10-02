import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { 
  CollaboratorInvitationModel,
  ReceivedMatchRequestModel
} from '../../models/api/collaborators';

@Injectable({
  providedIn: 'root'
})
export class CollaboratorInvitationApiService {
  private readonly section: string = 'collaborators/invitations';

  constructor(private readonly httpClient: HttpClient) { }

  public getInvitationsSummary = (): Observable<CollaboratorInvitationModel[]> =>
    this.httpClient.get<CollaboratorInvitationModel[]>(`${this.section}/summary`);

  public getCollaboratorInvitations = (collaboratorId: number): Observable<ReceivedMatchRequestModel[]> =>
    this.httpClient.get<ReceivedMatchRequestModel[]>(`${this.section}/${collaboratorId}`);
}