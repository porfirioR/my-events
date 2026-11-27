import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import { EmailLanguage, EmailTemplateHelper } from '../../utility/helpers/email-template.helper';
import { MAIL_FROM } from '../../utility/constants';

@Injectable()
export class MailAccessService {
  constructor(
    private mailerService: MailerService,
    private configService: ConfigService
  ) {}

  /**
   * Envía email de verificación
   */
  public sendVerificationEmail = async (
    email: string,
    verificationLink: string,
    language: EmailLanguage
  ): Promise<void> => {
    const { subject, html, text } = EmailTemplateHelper.verification(verificationLink, language);
    await this.mailerService.sendMail({ from: this.from(language), to: email, subject, html, text });
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
    await this.mailerService.sendMail({ from: this.from(language), to: email, subject, html, text });
  };

  /**
   * Envía un email ya armado (ej. el resumen del día 1, #263)
   */
  public sendHtmlEmail = async (email: string, subject: string, html: string, language: EmailLanguage): Promise<void> => {
    await this.mailerService.sendMail({ from: this.from(language), to: email, subject, html, text: EmailTemplateHelper.toText(html) });
  };

  // El nombre del remitente va en el idioma del email: "Mis Eventos" / "My Events"
  private from = (language: EmailLanguage): string =>
    `"${EmailTemplateHelper.appName(language)}" <${this.configService.get<string>(MAIL_FROM) ?? 'noreply@my-events.com'}>`;
}
