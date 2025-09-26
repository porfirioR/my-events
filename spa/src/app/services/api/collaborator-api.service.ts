import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { Observable } from 'rxjs'
import { CollaboratorApiModel, CollaboratorApiRequest } from '../../models/api/collaborators'

@Injectable({
  providedIn: 'root'
})
export class CollaboratorApiService {
  private readonly section: string = 'collaborator'

  constructor(private readonly httpClient: HttpClient) { }

  public getAll = (): Observable<CollaboratorApiModel[]> =>
    this.httpClient.get<CollaboratorApiModel[]>(`${this.section}`)

  public getById = (id: number): Observable<CollaboratorApiModel> =>
    this.httpClient.get<CollaboratorApiModel>(`${this.section}/${id}`)

  public changeVisibility = (id: number): Observable<CollaboratorApiModel> =>
    this.httpClient.delete<CollaboratorApiModel>(`${this.section}/change-visibility/${id}`)

  public upsertCollaborator = (request: CollaboratorApiRequest): Observable<CollaboratorApiModel> =>
    !request.id ?
    this.httpClient.post<CollaboratorApiModel>(this.section, request) :
    this.httpClient.put<CollaboratorApiModel>(this.section, request)

}
