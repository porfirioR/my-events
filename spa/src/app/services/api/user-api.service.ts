import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import {
  ForgotPasswordApiRequest,
  LoginUserApiRequest,
} from '../../models/api';
import { LocalService } from '../local.service';
import { TranslationService } from '../translation.service';
import { ResendVerificationEmailApiRequest, ResetPasswordApiRequest, SignApiModel, VerifyEmailApiRequest } from '../../models/api/auth';

@Injectable({
  providedIn: 'root',
})
export class UserApiService {
  private readonly section: string = 'users';

  constructor(
    private readonly httpClient: HttpClient,
    private readonly localService: LocalService,
    private readonly translationService: TranslationService
  ) {}

  /**
   * Login de usuario
   */
  public loginUser = (request: LoginUserApiRequest): Observable<SignApiModel> => {
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
      .post<SignApiModel>(`${this.section}/sign-up`, this.withLanguage(request))
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
      this.withLanguage(request)
    );

  /**
   * Solicita reset de contraseña
   */
  public forgotPassword = (request: ForgotPasswordApiRequest): Observable<{ message: string }> =>
    this.httpClient.post<{ message: string }>(
      `${this.section}/forgot-password`,
      this.withLanguage(request)
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

  private setInLocaleStorage = (user: SignApiModel): void => {
    this.localService.setEmail(user.email);
    this.localService.setName(user.name);
    this.localService.setSurname(user.surname);
    this.localService.setJwtToken(user.token);
    this.localService.setUserId(user.id);
    this.localService.setEmailVerified(user.isEmailVerified);
    this.localService.setCollaboratorId(user.userCollaboratorId);
  };

  // Los emails (verificación, reset) salen en el idioma elegido en el selector
  private withLanguage = <T extends object>(request: T): T & { language: string } =>
    ({ ...request, language: this.translationService.getCurrentLanguage() });
}