import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { Observable } from 'rxjs'
import { CreateEventApiRequest, EvenApiModel, UpdateEventApiRequest } from '../models/api'

@Injectable({
  providedIn: 'root'
})
export class EventApiService {
  private readonly section: string = 'events'

  constructor(private readonly httpClient: HttpClient) { }

  public getPublicEvents = (): Observable<EvenApiModel[]> =>
    this.httpClient.get<EvenApiModel[]>(`${this.section}`)

  public getMyEvents = (id: number): Observable<EvenApiModel[]> =>
    this.httpClient.get<EvenApiModel[]>(`${this.section}/my-events/${id}`)

  public getMyEvent = (id: number): Observable<EvenApiModel> =>
    this.httpClient.get<EvenApiModel>(`${this.section}/${id}`)

  public getMyEventFollows = (id: number): Observable<EvenApiModel[]> =>
    this.httpClient.get<EvenApiModel[]>(`${this.section}/follow/${id}`)

  public createEvent = (request: CreateEventApiRequest): Observable<EvenApiModel> =>
    this.httpClient.post<EvenApiModel>(this.section, request)

  public updateEvent = (request: UpdateEventApiRequest): Observable<EvenApiModel> =>
    this.httpClient.put<EvenApiModel>(this.section, request)

}
