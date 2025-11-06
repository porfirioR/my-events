import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailAccessService } from '../../access/mail';
import { SPA_URL } from '../../utility/constants';

@Injectable()
export class MailManagerService {
  constructor(
    private mailAccessService: MailAccessService,
    private configService: ConfigService
  ) {}

  /**
   * Envía email de verificación al registrarse
   */
  public sendVerificationEmail = async (
    email: string,
    verificationToken: string
  ): Promise<boolean> => {
    const baseUrl = this.configService.get<string>(SPA_URL);
    const verificationLink = `${baseUrl}/verify-email?token=${verificationToken}`;

    await this.mailAccessService.sendVerificationEmail(
      email,
      verificationLink
    );

    return true;
  };

  /**
   * Envía email de forgot password
   */
  public sendForgotPasswordEmail = async (
    email: string,
    resetToken: string
  ): Promise<boolean> => {
    const baseUrl = this.configService.get<string>(SPA_URL);
    const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;

    await this.mailAccessService.sendForgotPasswordEmail(email, resetLink);

    return true;
  };
}