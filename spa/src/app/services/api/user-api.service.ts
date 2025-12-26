import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import {
  CreateUserApiRequest,
  ForgotPasswordApiRequest,
  LoginUserApiRequest,
  PushTokenApiModel,
  PushTokenApiRequest,
  UserApiModel,
} from '../../models/api';
import { LocalService } from '../local.service';
import { ResendVerificationEmailApiRequest, ResetPasswordApiRequest, SignApiModel, VerifyEmailApiRequest } from '../../models/api/auth';

@Injectable({
  providedIn: 'root',
})
export class UserApiService {
  private readonly section: string = 'users';

  constructor(
    private readonly httpClient: HttpClient,
    private readonly localService: LocalService
  ) {}

  public getUsers = (): Observable<UserApiModel[]> =>
    this.httpClient.get<UserApiModel[]>(`${this.section}`);

  public getByUserId = (id: number): Observable<UserApiModel[]> =>
    this.httpClient.get<UserApiModel[]>(`${this.section}/${id}`);

  /**
   * Login de usuario
   */
  public loginUser = (request: CreateUserApiRequest): Observable<SignApiModel> => {
    const credentials = `${request.email}:${request.password}`;
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'user-authorization': `Basic ${btoa(credentials)}`,
    });
    const httpOptions = {
      headers: headers,
    };
    return this.httpClient
      .post<SignApiModel>(`${this.section}/login`, null, httpOptions)
      .pipe(tap(this.setInLocaleStorage));
  };

  /**
   * Sign up de usuario - ahora retorna info de verificación
   */
  public signUpUser = (request: LoginUserApiRequest): Observable<SignApiModel> =>
    this.httpClient
      .post<SignApiModel>(`${this.section}/sign-up`, request)
      .pipe(tap(this.setInLocaleStorage));

  /**
   * Verifica el email del usuario
   */
  public verifyEmail = (request: VerifyEmailApiRequest): Observable<SignApiModel> =>
    this.httpClient
      .post<SignApiModel>(`${this.section}/verify-email`, request)
      .pipe(tap(this.setInLocaleStorage));

  /**
   * Reenvía el email de verificación
   */
  public resendVerificationEmail = (
    request: ResendVerificationEmailApiRequest
  ): Observable<{ message: string }> =>
    this.httpClient.post<{ message: string }>(
      `${this.section}/resend-verification`,
      request
    );

  /**
   * Solicita reset de contraseña
   */
  public forgotPassword = (request: ForgotPasswordApiRequest): Observable<{ message: string }> =>
    this.httpClient.post<{ message: string }>(
      `${this.section}/forgot-password`,
      request
    );

  /**
   * Resetea la contraseña con token
   */
  public resetPassword = (request: ResetPasswordApiRequest): Observable<SignApiModel> =>
    this.httpClient
      .post<SignApiModel>(`${this.section}/reset-password`, request)
      .pipe(tap(this.setInLocaleStorage));

  public getUserInformation = (userId: number): Observable<unknown> =>
    this.httpClient.get<unknown>(`${this.section}/user-information/${userId}`);

  public saveToken = (request: PushTokenApiRequest): Observable<PushTokenApiModel> =>
    this.httpClient.post<PushTokenApiModel>(`${this.section}/save-token`, request);

  private setInLocaleStorage = (user: SignApiModel): void => {
    this.localService.setEmail(user.email);
    this.localService.setJwtToken(user.token);
    this.localService.setUserId(user.id);
    this.localService.setEmailVerified(user.isEmailVerified);
  };
}