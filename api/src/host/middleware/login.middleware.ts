import { BadRequestException, Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { UserManagerService } from '../../manager/services';
import { USER_AUTHORIZATION } from '../../utility/constants';
import { PasswordValidator } from '../../utility/helpers';

@Injectable()
export class LoginMiddleware implements NestMiddleware {
  constructor(private userManager: UserManagerService) { }
  async use(req: Request, res: Response, next: NextFunction) {
    const authorization: string = req.headers[USER_AUTHORIZATION] as string
    if (!authorization?.startsWith('Basic ')) {
      const invalidData: Record<string, string | number | Date | boolean | object> = {
        authorization: authorization
      }
      const invalidObject = JSON.stringify(invalidData)
      throw new UnauthorizedException(invalidObject)
    }
    const key = authorization.split('Basic ').at(1)
    const [email, password] = atob(key).split(':')
    const emails = (await this.userManager.getUsers()).map(x => x.email.toLocaleLowerCase())
    const isInvalid = !email || !emails.includes(email.toLocaleLowerCase())
    if (isInvalid) {
      throw new BadRequestException('The email and/or password is incorrect')
    }
    // Mismo rango que al registrarse o restablecer la contraseña, con un mensaje que indica qué falla
    PasswordValidator.validate(password)
    next();
  }
}
