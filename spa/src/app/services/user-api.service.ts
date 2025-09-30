import { HttpClient, HttpHeaders } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { Observable, tap } from 'rxjs'
import { CreateUserApiRequest, ForgotPasswordApiRequest, LoginUserApiRequest, PushTokenApiModel, PushTokenApiRequest, SignApiModel, UserApiModel } from '../models/api'
import { LocalService } from './local.service'
import { ResetPasswordApiRequest } from '../models/api/reset-password-api-request'

@Injectable({
  providedIn: 'root'
})
export class UserApiService {
  private readonly section: string = 'users'

  constructor(
    private readonly httpClient: HttpClient,
    private readonly localService: LocalService
  ) { }

  public getUsers = (): Observable<UserApiModel[]> =>
    this.httpClient.get<UserApiModel[]>(`${this.section}`)

  public getByUserId = (id: number): Observable<UserApiModel[]> =>
    this.httpClient.get<UserApiModel[]>(`${this.section}/${id}`)

  public loginUser = (request: CreateUserApiRequest): Observable<SignApiModel> => {
    const credentials = `${request.email}:${request.password}`
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'user-authorization': `Basic ${btoa(credentials)}`
    })
    const httpOptions = {
      headers: headers
    }
    return this.httpClient.post<SignApiModel>(`${this.section}/login`, null, httpOptions).pipe(tap(this.setInLocaleStorage))
  }

  public signUpUser = (request: LoginUserApiRequest): Observable<SignApiModel> =>
    this.httpClient.post<SignApiModel>(`${this.section}/sign-up`, request).pipe(tap(this.setInLocaleStorage))

  public forgotPassword = (request: ForgotPasswordApiRequest): Observable<boolean> =>
    this.httpClient.post<boolean>(`${this.section}/forgot-password`, request)

  public resetPassword = (request: ResetPasswordApiRequest): Observable<SignApiModel> =>
    this.httpClient.post<SignApiModel>(`${this.section}/reset-password`, request).pipe(tap(this.setInLocaleStorage))

  public getUserInformation = (userId: number): Observable<unknown> =>
    this.httpClient.get<unknown>(`${this.section}/user-information/${userId}`)

  public saveToken = (request: PushTokenApiRequest): Observable<PushTokenApiModel> =>
    this.httpClient.post<PushTokenApiModel>(`${this.section}/save-token`, request)

  private setInLocaleStorage = (user: SignApiModel): void => {
    this.localService.setEmail(user.email)
    this.localService.setJwtToken(user.token)
    this.localService.setUserId(user.id)
  }
}
