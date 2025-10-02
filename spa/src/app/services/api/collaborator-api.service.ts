import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { Observable } from 'rxjs'
import { CanDeleteResponseModel, CollaboratorApiModel, CollaboratorApiRequest, CollaboratorStatsModel, EnrichedCollaboratorApiModel, MessageModel } from '../../models/api/collaborators'

@Injectable({
  providedIn: 'root'
})
export class CollaboratorApiService {
  private readonly section: string = 'collaborators';

  constructor(private readonly httpClient: HttpClient) { }

  // Existing methods
  public getAll = (): Observable<CollaboratorApiModel[]> =>
    this.httpClient.get<CollaboratorApiModel[]>(`${this.section}`);

  public getAllEnriched = (): Observable<EnrichedCollaboratorApiModel[]> =>
    this.httpClient.get<EnrichedCollaboratorApiModel[]>(`${this.section}/enriched`);

  public getInternalCollaborators = (): Observable<CollaboratorApiModel[]> =>
    this.httpClient.get<CollaboratorApiModel[]>(`${this.section}/internal`);

  public getExternalCollaborators = (): Observable<CollaboratorApiModel[]> =>
    this.httpClient.get<CollaboratorApiModel[]>(`${this.section}/external`);

  public getExternalCollaboratorsEnriched = (): Observable<EnrichedCollaboratorApiModel[]> =>
    this.httpClient.get<EnrichedCollaboratorApiModel[]>(`${this.section}/external/enriched`);

  public getCollaboratorStats = (): Observable<CollaboratorStatsModel> =>
    this.httpClient.get<CollaboratorStatsModel>(`${this.section}/stats`);

  public canDeleteCollaborator = (id: number): Observable<CanDeleteResponseModel> =>
    this.httpClient.get<CanDeleteResponseModel>(`${this.section}/can-delete/${id}`);

  public getById = (id: number): Observable<CollaboratorApiModel> =>
    this.httpClient.get<CollaboratorApiModel>(`${this.section}/${id}`);

  public getByIdEnriched = (id: number): Observable<EnrichedCollaboratorApiModel> =>
    this.httpClient.get<EnrichedCollaboratorApiModel>(`${this.section}/${id}/enriched`);

  public changeVisibility = (id: number): Observable<CollaboratorApiModel> =>
    this.httpClient.put<CollaboratorApiModel>(`${this.section}/change-visibility/${id}`, {});

  public resendInvitation = (id: number): Observable<MessageModel> =>
    this.httpClient.post<MessageModel>(`${this.section}/${id}/resend-invitation`, {});

  public upsertCollaborator = (request: CollaboratorApiRequest): Observable<CollaboratorApiModel> =>
    !request.id ?
    this.httpClient.post<CollaboratorApiModel>(this.section, request) :
    this.httpClient.put<CollaboratorApiModel>(this.section, request);
}
