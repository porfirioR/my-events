import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ForgotPasswordAccessRequest } from '../contract/users/forgot-password-access-request';
import { SPA_URL } from '../../utility/constants';

@Injectable()
export class MailAccessService {
  constructor(
    private mailerService: MailerService,
    private configService: ConfigService
  ) {}

  public async forgotPassword(request: ForgotPasswordAccessRequest) {
    const url = `${this.configService.get<string>(SPA_URL)}reset-password`
    const template = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Forgot your Password</title>
          <style>
            body {
              background-color: #e8f0fe;
            }
          </style>
        </head>
        <body>
          <h1>Reset your Password</h1>
          <h3>Hey ${request.email} the code to reset your password is: </h3>
          <p style="display: flex; justify-content:center">
            <b style="border-style: solid; border-color:#4F46E5;>${request.code}</b>
          </p>
          <p>
            Please click on the next link and add the code <b>${url}</b> to reset your password.
          </p>
          <p>
            Or click <b style="border-style: solid; border-color:#4F46E5;">${url}?email=${request.email}&code=${request.code}</b> to the next link to with the code include in the link and change your password
          </p>
          <p>
            If you did not request this email you can safely ignore it.
          </p>
        </body>
      </html>
    `;
    return this.mailerService.sendMail({
      to: request.email,
      subject: 'Forgot Password',
      html: template
    });
  }
}
