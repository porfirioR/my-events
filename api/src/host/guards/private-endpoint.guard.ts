import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { UpdateEventApiRequest } from '../models/events/update-event-api-request';
import { EventManagerService, UserManagerService } from '../../manager/services';
import { JWT_TOKEN, JWT_USER_TOKEN } from '../../utility/constants';
import { DatabaseColumns } from '../../utility/enums';

@Injectable()
export class PrivateEndpointGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly eventManager: EventManagerService,
    private readonly userManager: UserManagerService
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(DatabaseColumns.IsPublic, [context.getHandler(), context.getClass()])
    if (isPublic) {
      return isPublic
    }
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      const invalidData: Record<string, string | number | Date | boolean | object> = {
        isPublic: isPublic,
        token: token,
        requestUrl: request?.url,
        requestBaseUrl: request?.baseUrl,
      }
      const invalidObject = JSON.stringify(invalidData)
      throw new UnauthorizedException(invalidObject);
    }

    const jwtToken = this.configService.get<string>(JWT_TOKEN)
    const payload = await this.jwtService.verifyAsync(
      token,
      {
        secret: jwtToken
      }
    );
    const email = payload[DatabaseColumns.Email];
    if (!email) {
      return false
    }
    const user = await this.userManager.getUserByEmail(email)
    // if (request.method === 'PUT') {
    //   const body: UpdateEventApiRequest = request.body
    //   const myEvents = await this.eventManager.getMyEvents(user.id)
    //   const eventToUpdateIsMine = myEvents.some(x => x.id === body.id)
    //   return eventToUpdateIsMine
    // }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers[JWT_USER_TOKEN]?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
