import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { Observable } from 'rxjs'
import { CreateSavingApiRequest, SavingApiModel, UpdateSavingApiRequest } from '../models/api'

@Injectable({
  providedIn: 'root'
})
export class SavingApiService {
  private readonly section: string = 'savings'

  constructor(private readonly httpClient: HttpClient) { }

  public getMySavings = (authorId: number, id: number): Observable<SavingApiModel[]> =>
    this.httpClient.get<SavingApiModel[]>(`${this.section}/${authorId}/${id}`)

  public createSaving = (request: CreateSavingApiRequest): Observable<SavingApiModel> =>
    this.httpClient.post<SavingApiModel>(this.section, request)

  public updateSaving = (request: UpdateSavingApiRequest): Observable<SavingApiModel> =>
    this.httpClient.put<SavingApiModel>(this.section, request)

  //todo backend with full details of one specific saving
  public getMySaving = (id: number): Observable<SavingApiModel> =>
    this.httpClient.get<SavingApiModel>(`${this.section}/${id}`)

}
