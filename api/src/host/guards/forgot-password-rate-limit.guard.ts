// src/web/guards/forgot-password-rate-limit.guard.ts (NUEVO)
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ForgotPasswordApiRequest } from '../models/users/forgot-password-api-request';
import { AUTH_CONFIG } from '../../utility/constants';

@Injectable()
export class ForgotPasswordRateLimitGuard implements CanActivate {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const body: ForgotPasswordApiRequest = request.body;
    const email = body.email;

    if (!email) {
      throw new BadRequestException('Email is required');
    }

    // Verificar rate limit en cache
    const cacheKey = `forgot_password_${email}`;
    const attempts: number = (await this.cacheManager.get(cacheKey)) || 0;

    if (attempts >= AUTH_CONFIG.PASSWORD_RESET.MAX_ATTEMPTS_PER_HOUR) {
      throw new BadRequestException(
        `Too many password reset attempts. Please try again in 1 hour.`
      );
    }

    // Incrementar contador (expira en 1 hora)
    await this.cacheManager.set(cacheKey, attempts + 1, 3600000); // 1 hora en ms

    return true;
  }
}