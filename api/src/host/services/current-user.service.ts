import { Inject, Injectable, Scope, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { REQUEST } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { JWT_TOKEN, JWT_USER_TOKEN } from '../../utility/constants';

@Injectable({ scope: Scope.REQUEST })
export class CurrentUserService {
    private cachedPayload: any = null;

  constructor(
    @Inject(REQUEST) private readonly request: Request,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async getCurrentUserId(): Promise<number> {
    const payload = await this.getPayload();
    return payload.id;
  }

  async getCurrentUserEmail(): Promise<string> {
    const payload = await this.getPayload();
    return payload.email;
  }

  private async getPayload(): Promise<any> {
    if (this.cachedPayload) {
      return this.cachedPayload;
    }

    const token = this.extractTokenFromHeader();
    if (!token) {
      throw new UnauthorizedException('Token not found');
    }

    try {
      const jwtSecret = this.configService.get<string>(JWT_TOKEN);
      this.cachedPayload = await this.jwtService.verifyAsync(token, { 
        secret: jwtSecret 
      });
      
      return this.cachedPayload;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeader(): string | undefined {
    const [type, token] = this.request.headers[JWT_USER_TOKEN]?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
