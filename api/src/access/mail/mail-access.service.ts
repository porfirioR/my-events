import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailAccessService {
  constructor(private mailerService: MailerService) {}

  /**
   * Envía email de verificación
   */
  public sendVerificationEmail = async (
    email: string,
    verificationLink: string
  ): Promise<void> => {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Verify your email address',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome! Verify Your Email</h2>
          <p>Thank you for signing up. Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" 
                style="background-color: #432dd7; color: white; padding: 14px 28px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Verify Email
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            This link will expire in 7 days. If you didn't create an account, please ignore this email.
          </p>
          <p style="color: #666; font-size: 12px;">
            Or copy and paste this link in your browser:<br>
            <a href="${verificationLink}">${verificationLink}</a>
          </p>
        </div>
      `,
    });
  };

  /**
   * Envía email de forgot password
   */
  public sendForgotPasswordEmail = async (
    email: string,
    resetLink: string
  ): Promise<void> => {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Reset your password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Reset Your Password</h2>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" 
              style="background-color: #432dd7; color: white; padding: 14px 28px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            This link will expire in 2 hours. If you didn't request a password reset, please ignore this email.
          </p>
          <p style="color: #666; font-size: 12px;">
            Or copy and paste this link in your browser:<br>
            <a href="${resetLink}">${resetLink}</a>
          </p>
        </div>
      `,
    });
  };
}