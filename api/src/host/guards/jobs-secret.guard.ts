import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { JOBS_SECRET, JOBS_SECRET_HEADER } from '../../utility/constants';

// Las tareas programadas no tienen usuario: las llama el workflow de GitHub con un secreto compartido (#263).
// Sin JOBS_SECRET configurado, el endpoint queda cerrado.
@Injectable()
export class JobsSecretGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.configService.get<string>(JOBS_SECRET);
    const received = context.switchToHttp().getRequest().headers?.[JOBS_SECRET_HEADER];
    if (!expected || typeof received !== 'string') throw new UnauthorizedException();

    const a = Buffer.from(expected);
    const b = Buffer.from(received);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new UnauthorizedException();
    return true;
  }
}
