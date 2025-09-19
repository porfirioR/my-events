import { Injectable } from '@nestjs/common';
import { MailAccessService } from '../../access/mail';
import { ForgotPasswordAccessRequest } from '../../access/contract/users/forgot-password-access-request';
import { UserAccessService } from '../../access/data/services/user-access.service';
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
