import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ResetUserPasswordApiRequest } from '../models/users/reset-user-password-api-request';
import { AUTH_CONFIG } from '../../utility/constants';

@Injectable()
export class ResetPasswordRateLimitGuard implements CanActivate {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const body: ResetUserPasswordApiRequest = request.body;
    const email = body.email;

    if (!email) {
      throw new BadRequestException('Email is required');
    }

    // Verificar rate limit en cache
    const cacheKey = `reset_password_${email}`;
    const attempts: number = (await this.cacheManager.get(cacheKey)) || 0;

    if (attempts >= AUTH_CONFIG.RATE_LIMIT.RESET_PASSWORD_MAX_ATTEMPTS) {
      throw new BadRequestException(
        `Too many failed reset attempts. Please try again in 1 hour.`
      );
    }

    // Incrementar contador (expira en 1 hora)
    await this.cacheManager.set(cacheKey, attempts + 1, 3600000);

    return true;
  }
}