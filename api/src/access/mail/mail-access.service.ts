import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { EmailLanguage, EmailTemplateHelper } from '../../utility/helpers/email-template.helper';

@Injectable()
export class MailAccessService {
  constructor(private mailerService: MailerService) {}

  /**
   * Envía email de verificación
   */
  public sendVerificationEmail = async (
    email: string,
    verificationLink: string,
    language: EmailLanguage
  ): Promise<void> => {
    const { subject, html, text } = EmailTemplateHelper.verification(verificationLink, language);
    await this.mailerService.sendMail({ to: email, subject, html, text });
  };

  /**
   * Envía email de forgot password
   */
  public sendForgotPasswordEmail = async (
    email: string,
    resetLink: string,
    language: EmailLanguage
  ): Promise<void> => {
    const { subject, html, text } = EmailTemplateHelper.resetPassword(resetLink, language);
    await this.mailerService.sendMail({ to: email, subject, html, text });
  };

  /**
   * Envía un email ya armado (ej. el resumen mensual, #263)
   */
  public sendHtmlEmail = async (email: string, subject: string, html: string): Promise<void> => {
    await this.mailerService.sendMail({ to: email, subject, html, text: EmailTemplateHelper.toText(html) });
  };
}
