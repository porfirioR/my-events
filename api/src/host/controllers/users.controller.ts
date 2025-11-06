import {
  Body,
  Controller,
  Get,
  Headers,
  Logger,
  Post,
  UseGuards,
  Ip,
} from '@nestjs/common';
import { MailManagerService, UserManagerService } from '../../manager/services';
import {
  ResetUserPasswordRequest,
  SignModel,
  UserModel,
  UserRequest,
  VerifyEmailRequest,
  ResendVerificationEmailRequest,
} from '../../manager/models/users';
import { CreateUserApiRequest } from '../models/users/create-user-api-request';
import { Public } from '../decorators/public.decorator';
import { PrivateEndpointGuard } from '../guards/private-endpoint.guard';
import { ForgotPasswordRateLimitGuard } from '../guards/forgot-password-rate-limit.guard';
import { ResetPasswordRateLimitGuard } from '../guards/reset-password-rate-limit.guard';
import { DatabaseColumns } from '../../utility/enums';
import { ResetUserPasswordApiRequest } from '../models/users/reset-user-password-api-request';
import { ForgotPasswordApiRequest } from '../models/users/forgot-password-api-request';
import { VerifyEmailApiRequest } from '../models/users/verify-email-api-request';
import { ResendVerificationEmailApiRequest } from '../models/users/resend-verification-email-api-request';
import { USER_AUTHORIZATION } from '../../utility/constants';

@Controller('users')
@UseGuards(PrivateEndpointGuard)
export class UsersController {
  private readonly logger = new Logger('UsersController');

  constructor(
    private userManagerService: UserManagerService,
    private mailManagerService: MailManagerService
  ) {
    this.logger.log('🎯 Controller register user');
  }

  /**
   * GET /users/admin - Obtener todos los usuarios (admin)
   */
  @Get('admin')
  async getUsers(): Promise<UserModel[]> {
    this.logger.log('UsersController: getUsers');
    const modelList = await this.userManagerService.getUsers();
    return modelList;
  }

  /**
   * GET /users - Obtener usuario por email
   */
  @Get()
  async getUserByEmail(
    @Headers(DatabaseColumns.Email) email: string
  ): Promise<UserModel> {
    this.logger.log('UsersController: getUserByEmail');
    const model = await this.userManagerService.getUserByEmail(email);
    return model;
  }

  /**
   * POST /users/sign-up - Registrar nuevo usuario
   */
  @Post('sign-up')
  @Public()
  async registerUser(
    @Body() apiRequest: CreateUserApiRequest
  ): Promise<SignModel> {
    this.logger.log('UsersController: registerUser');

    const request = new UserRequest(apiRequest.email, apiRequest.password);
    const { user, verificationToken } = await this.userManagerService.registerUser(
      request
    );

    // Enviar email de verificación
    await this.mailManagerService.sendVerificationEmail(
      user.email,
      verificationToken
    );

    return user;
  }

  /**
   * POST /users/verify-email - Verificar email del usuario
   */
  @Post('verify-email')
  @Public()
  async verifyEmail(@Body() apiRequest: VerifyEmailApiRequest): Promise<SignModel> {
    this.logger.log('UsersController: verifyEmail');

    const request = new VerifyEmailRequest(apiRequest.token);
    const model = await this.userManagerService.verifyEmail(request);

    return model;
  }

  /**
   * POST /users/resend-verification - Reenviar email de verificación
   */
  @Post('resend-verification')
  @Public()
  async resendVerificationEmail(@Body() apiRequest: ResendVerificationEmailApiRequest): Promise<{ message: string }> {
    this.logger.log('UsersController: resendVerificationEmail');

    const request = new ResendVerificationEmailRequest(apiRequest.email);
    const { verificationToken } = await this.userManagerService.resendVerificationEmail(
      request
    );

    // Enviar email de verificación
    await this.mailManagerService.sendVerificationEmail(
      apiRequest.email,
      verificationToken
    );

    return {
      message: 'Verification email sent successfully. Please check your inbox.',
    };
  }

  /**
   * POST /users/login - Login de usuario
   */
  @Post('login')
  @Public()
  async login(@Headers(USER_AUTHORIZATION) authorization: string): Promise<SignModel> {
    this.logger.log('UsersController: login');
    const model = await this.userManagerService.loginUser(authorization);
    return model;
  }

  /**
   * POST /users/forgot-password - Solicitar reset de contraseña
   */
  @Post('forgot-password')
  @Public()
  @UseGuards(ForgotPasswordRateLimitGuard)
  async forgotPassword(
    @Body() apiRequest: ForgotPasswordApiRequest,
    @Ip() ipAddress: string
  ): Promise<{ message: string }> {
    this.logger.log('UsersController: forgotPassword');

    try {
      // Intentar generar token
      const { resetToken } = await this.userManagerService.initiateForgotPassword(
        apiRequest.email,
        ipAddress
      );

      // Enviar email
      await this.mailManagerService.sendForgotPasswordEmail(
        apiRequest.email,
        resetToken
      );
    } catch (error) {
      // IMPORTANTE: Siempre responder lo mismo para prevenir enumeración de emails
      this.logger.warn(`Forgot password error: ${error.message}`);
    }

    // Siempre responder success (seguridad)
    return {
      message:
        'If the email exists, a password reset link has been sent. Please check your inbox.',
    };
  }

  /**
   * POST /users/reset-password - Resetear contraseña con token
   */
  @Post('reset-password')
  @Public()
  @UseGuards(ResetPasswordRateLimitGuard)
  async resetPassword(@Body() apiRequest: ResetUserPasswordApiRequest): Promise<SignModel> {
    this.logger.log('UsersController: resetPassword');

    const request = new ResetUserPasswordRequest(
      apiRequest.email,
      apiRequest.newPassword,
      apiRequest.token
    );

    const model = await this.userManagerService.resetUserPassword(request);
    return model;
  }
}