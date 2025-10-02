import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { 
  CollaboratorMatchModel,
  MessageModel,
} from '../../models/api/collaborators';

@Injectable({
  providedIn: 'root'
})
export class CollaboratorMatchApiService {
  private readonly section: string = 'collaborators/matches';

  constructor(private readonly httpClient: HttpClient) { }

  public getMatches = (): Observable<CollaboratorMatchModel[]> =>
    this.httpClient.get<CollaboratorMatchModel[]>(`${this.section}`);

  public deleteMatch = (id: number): Observable<MessageModel> =>
    this.httpClient.delete<MessageModel>(`${this.section}/${id}`);
}