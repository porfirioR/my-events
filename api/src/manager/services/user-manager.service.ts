import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UserAccessService } from '../../access/data/services/user-access.service';
import { PasswordResetTokenAccessService } from '../../access/data/services/password-reset-token-access.service';
import { EmailVerificationTokenAccessService } from '../../access/data/services/email-verification-token-access.service';
import { AuthService } from '../../access/auth/auth.service';
import { CreateUserAccessRequest, ResetUserAccessRequest, UserAccessModel } from '../../access/contract/users';
import { CreatePasswordResetTokenRequest } from '../../access/contract/tokens/create-password-reset-token-request';
import { CreateEmailVerificationTokenRequest } from '../../access/contract/tokens/create-email-verification-token-request';
import { AuthUserModel } from '../../access/auth/contracts/auth-user-model';
import {
  ResetUserPasswordRequest,
  SignModel,
  UserModel,
  UserRequest,
  VerifyEmailRequest,
  ResendVerificationEmailRequest,
  WebPushModel,
} from '../models/users';
import { TokenGenerator } from '../../utility/helpers/token-generator.helper';
import { AUTH_CONFIG } from '../../utility/constants';

@Injectable()
export class UserManagerService {
  constructor(
    private userAccessService: UserAccessService,
    private passwordResetTokenAccessService: PasswordResetTokenAccessService,
    private emailVerificationTokenAccessService: EmailVerificationTokenAccessService,
    private authService: AuthService
  ) {}

  /**
   * Obtiene todos los usuarios (admin)
   */
  public getUsers = async (): Promise<UserModel[]> => {
    const accessModelList = await this.userAccessService.getUsers();
    return accessModelList.map(this.getUserModel);
  };

  /**
   * Registra un nuevo usuario y envía email de verificación
   */
  public registerUser = async (request: UserRequest): Promise<{ user: SignModel; verificationToken: string }> => {
    // Hashear contraseña
    const password = await this.authService.getHash(request.password);

    // Crear usuario con email no verificado
    const accessModel = await this.userAccessService.createUser(
      new CreateUserAccessRequest(
        request.email,
        password,
        request.name,
        request.surname
      )
    );

    // Generar token de verificación de email
    const verificationToken = TokenGenerator.generateSecureToken(
      AUTH_CONFIG.EMAIL_VERIFICATION.TOKEN_LENGTH
    );
    const expiresAt = TokenGenerator.calculateExpiry(
      undefined,
      AUTH_CONFIG.EMAIL_VERIFICATION.EXPIRY_DAYS
    );

    await this.emailVerificationTokenAccessService.createToken(
      new CreateEmailVerificationTokenRequest(
        accessModel.id,
        verificationToken,
        expiresAt
      )
    );

    // Generar JWT (usuario puede usar la app pero debe verificar email)
    const authModel = this.getAuthUserModel(accessModel);
    const jwtToken = await this.authService.getToken(authModel);

    return {
      user: this.getSignModel(accessModel, jwtToken, false),
      verificationToken, // Para que MailManager envíe el email
    };
  };

  /**
   * Login de usuario
   */
  public loginUser = async (request: string): Promise<SignModel> => {
    const key = request.split('Basic ').at(1);
    const [email, password] = atob(key).split(':');

    const accessModel = await this.userAccessService.getUserByEmail(email);
    const authModel = this.getAuthUserModel(accessModel);

    await this.authService.checkUser(
      { email, passwordHash: password },
      authModel
    );

    const jwtToken = await this.authService.getToken(authModel);

    return this.getSignModel(accessModel, jwtToken, accessModel.isEmailVerified);
  };

  /**
   * Obtiene un usuario por email
   */
  public getUserByEmail = async (email: string): Promise<UserModel> => {
    const accessModel = await this.userAccessService.getUserByEmail(email);
    return this.getUserModel(accessModel);
  };

  /**
   * Verifica el email del usuario
   */
  public verifyEmail = async (request: VerifyEmailRequest): Promise<SignModel> => {
    // Obtener y validar token
    const tokenModel = await this.emailVerificationTokenAccessService.getValidToken(
      request.token
    );

    if (!tokenModel) {
      throw new BadRequestException(
        'Invalid or expired verification token. Please request a new one.'
      );
    }

    // Marcar email como verificado
    const userModel = await this.userAccessService.markEmailAsVerified(
      tokenModel.userId
    );

    // Marcar token como usado
    await this.emailVerificationTokenAccessService.markTokenAsVerified(
      tokenModel.id
    );

    // Invalidar otros tokens del usuario
    await this.emailVerificationTokenAccessService.invalidateUserTokens(
      tokenModel.userId
    );

    // Generar nuevo JWT con email verificado
    const authModel = this.getAuthUserModel(userModel);
    const jwtToken = await this.authService.getToken(authModel);

    return this.getSignModel(userModel, jwtToken, true);
  };

  /**
   * Reenvía el email de verificación
   */
  public resendVerificationEmail = async (
    request: ResendVerificationEmailRequest
  ): Promise<{ verificationToken: string }> => {
    // Obtener usuario
    const userModel = await this.userAccessService.getUserByEmail(request.email);

    // Verificar si ya está verificado
    if (userModel.isEmailVerified) {
      throw new BadRequestException('Email is already verified.');
    }

    // Rate limiting: verificar intentos recientes
    const recentAttempts = await this.emailVerificationTokenAccessService.countRecentAttempts(
      userModel.id,
      1 // última hora
    );

    if (recentAttempts >= AUTH_CONFIG.EMAIL_VERIFICATION.MAX_RESEND_PER_HOUR) {
      throw new BadRequestException(
        `Maximum ${AUTH_CONFIG.EMAIL_VERIFICATION.MAX_RESEND_PER_HOUR} verification emails per hour. Please try again later.`
      );
    }

    // Invalidar tokens anteriores
    await this.emailVerificationTokenAccessService.invalidateUserTokens(
      userModel.id
    );

    // Generar nuevo token
    const verificationToken = TokenGenerator.generateSecureToken(
      AUTH_CONFIG.EMAIL_VERIFICATION.TOKEN_LENGTH
    );
    const expiresAt = TokenGenerator.calculateExpiry(
      undefined,
      AUTH_CONFIG.EMAIL_VERIFICATION.EXPIRY_DAYS
    );

    await this.emailVerificationTokenAccessService.createToken(
      new CreateEmailVerificationTokenRequest(
        userModel.id,
        verificationToken,
        expiresAt
      )
    );

    return { verificationToken };
  };

  /**
   * Inicia el proceso de reset de contraseña
   */
  public initiateForgotPassword = async (
    email: string,
    ipAddress?: string
  ): Promise<{ resetToken: string }> => {
    // Obtener usuario
    const userModel = await this.userAccessService.getUserByEmail(email);

    // Rate limiting: verificar intentos recientes
    const recentAttempts = await this.passwordResetTokenAccessService.countRecentAttempts(
      userModel.id,
      1 // última hora
    );

    if (recentAttempts >= AUTH_CONFIG.PASSWORD_RESET.MAX_ATTEMPTS_PER_HOUR) {
      throw new BadRequestException(
        `Maximum ${AUTH_CONFIG.PASSWORD_RESET.MAX_ATTEMPTS_PER_HOUR} password reset attempts per hour. Please try again later.`
      );
    }

    // Invalidar tokens anteriores
    await this.passwordResetTokenAccessService.invalidateUserTokens(
      userModel.id
    );

    // Generar nuevo token
    const resetToken = TokenGenerator.generateSecureToken(
      AUTH_CONFIG.PASSWORD_RESET.TOKEN_LENGTH
    );
    const expiresAt = TokenGenerator.calculateExpiry(
      AUTH_CONFIG.PASSWORD_RESET.EXPIRY_HOURS
    );

    await this.passwordResetTokenAccessService.createToken(
      new CreatePasswordResetTokenRequest(
        userModel.id,
        resetToken,
        expiresAt,
        ipAddress
      )
    );
    return { resetToken };
  };

  /**
   * Resetea la contraseña usando el token
   */
  public resetUserPassword = async (request: ResetUserPasswordRequest): Promise<SignModel> => {
    // Validar token
    const tokenModel = await this.passwordResetTokenAccessService.getValidToken(
      request.token
    );

    if (!tokenModel) {
      throw new UnauthorizedException(
        'Invalid or expired reset token. Please request a new password reset.'
      );
    }

    // Obtener usuario por email (validación adicional)
    const userModel = await this.userAccessService.getUserByEmail(request.email);

    // Verificar que el token pertenece al usuario correcto
    if (tokenModel.userId !== userModel.id) {
      throw new UnauthorizedException('Invalid reset token for this user.');
    }

    // Hashear nueva contraseña
    const hashedPassword = await this.authService.getHash(request.password);

    // Actualizar contraseña
    const updatedUser = await this.userAccessService.resetPassword(
      new ResetUserAccessRequest(request.email, hashedPassword)
    );

    // Marcar token como usado
    await this.passwordResetTokenAccessService.markTokenAsUsed(tokenModel.id);

    // Invalidar otros tokens del usuario
    await this.passwordResetTokenAccessService.invalidateUserTokens(userModel.id);

    // Generar nuevo JWT para auto-login
    const authModel = this.getAuthUserModel(updatedUser);
    const jwtToken = await this.authService.getToken(authModel);

    return this.getSignModel(updatedUser, jwtToken, updatedUser.isEmailVerified);
  };

  public getWebPushToken = async (): Promise<WebPushModel> => {
    const accessModel = await this.userAccessService.getWebPushToken();
    const model = new WebPushModel(accessModel.id, accessModel.endpoint, accessModel.expirationTime, accessModel.keys)
    return model;
  }

  /**
   * Mapea AccessModel a UserModel
   */
  private getUserModel = (accessModel: UserAccessModel): UserModel => new UserModel(
    accessModel.id,
    accessModel.email,
    accessModel.name,
    accessModel.surname,
    accessModel.dateCreated,
    '', // token vacío (se llena en endpoints específicos)
    accessModel.isEmailVerified
  );

  private getAuthUserModel = (accessModel: UserAccessModel): AuthUserModel => new AuthUserModel(
    accessModel.id,
    accessModel.email,
    accessModel.password,
    accessModel.name,
    accessModel.surname
  );

  private getSignModel = (accessModel: UserAccessModel, jwtToken: string, isEmailVerified: boolean): SignModel => new SignModel(
    accessModel.id,
    accessModel.email,
    accessModel.name,
    accessModel.surname,
    jwtToken,
    isEmailVerified
  );
}