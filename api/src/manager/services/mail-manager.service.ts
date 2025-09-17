import { Injectable } from '@nestjs/common';
import { MailAccessService, UserAccessService } from '../../access/mail';
import { ForgotPasswordAccessRequest } from 'src/access/contract/users/forgot-password-access-request';
import { generateRandomCode } from '../../utility/functions/random-code';

@Injectable()
export class MailManagerService {
  constructor(
    private userAccessService: UserAccessService,
    private mailAccessService: MailAccessService
  ) {}

  public async forgotPassword(email: string): Promise<boolean> {
    const code = generateRandomCode()
    const accessRequest = new ForgotPasswordAccessRequest(email, code)
    await this.userAccessService.addForgotCodePassword(accessRequest)
    await this.mailAccessService.forgotPassword(accessRequest)
    return true
  }
}
