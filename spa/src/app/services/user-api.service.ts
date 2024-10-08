import { HttpClient, HttpHeaders } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { Observable, tap } from 'rxjs'
import { CreateUserApiRequest, ForgotPasswordApiRequest, LoginUserApiRequest, PushTokenApiModel, PushTokenApiRequest, SignApiModel, UserApiModel } from '../models/api'
import { environment } from '../../environments/environment'
import { LocalService } from './local.service'
import { ResetPasswordApiRequest } from '../models/api/reset-password-api-request'

@Injectable({
  providedIn: 'root'
})
export class UserApiService {
  private url: string

  constructor(
    private readonly httpClient: HttpClient,
    private readonly localService: LocalService
  ) {
    this.url = `${environment.baseUrl}users`
  }

  public getUsers = (): Observable<UserApiModel[]> => {
    return this.httpClient.get<UserApiModel[]>(`${this.url}`)
  }

  public getByUserId = (id: number): Observable<UserApiModel[]> => {
    return this.httpClient.get<UserApiModel[]>(`${this.url}/${id}`)
  }

  public loginUser = (request: CreateUserApiRequest): Observable<SignApiModel> => {
    const credentials = `${request.email}:${request.password}`
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'user-authorization': `Basic ${btoa(credentials)}`
    })
    const httpOptions = {
      headers: headers
    }
    return this.httpClient.post<SignApiModel>(`${this.url}/login`, null, httpOptions).pipe(tap(this.setInLocaleStorage))
  }

  public signUpUser = (request: LoginUserApiRequest): Observable<SignApiModel> => {
    return this.httpClient.post<SignApiModel>(`${this.url}/sign-up`, request).pipe(tap(this.setInLocaleStorage))
  }

  public forgotPassword = (request: ForgotPasswordApiRequest): Observable<boolean> => {
    return this.httpClient.post<boolean>(`${this.url}/forgot-password`, request)
  }

  public resetPassword = (request: ResetPasswordApiRequest): Observable<SignApiModel> => {
    return this.httpClient.post<SignApiModel>(`${this.url}/reset-password`, request).pipe(tap(this.setInLocaleStorage))
  }

  public getUserInformation = (userId: number): Observable<unknown> => {
    return this.httpClient.get<unknown>(`${this.url}/user-information/${userId}`)
  }

  public saveToken = (request: PushTokenApiRequest): Observable<PushTokenApiModel> => {
    return this.httpClient.post<PushTokenApiModel>(`${this.url}/save-token`, request)
  }

  private setInLocaleStorage = (user: SignApiModel): void => {
    this.localService.setEmail(user.email)
    this.localService.setJwtToken(user.token)
    this.localService.setUserId(user.id)
  }
}
