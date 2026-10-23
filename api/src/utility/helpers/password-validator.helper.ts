import { BadRequestException } from '@nestjs/common';
import { AUTH_CONFIG } from '../constants';

export class PasswordValidator {
  /**
   * Valida el largo de la contraseña y lanza un error que indica exactamente qué está mal
   */
  static validate(password: string | null | undefined): void {
    if (!password) {
      throw new BadRequestException('Password is required');
    }

    const { MIN_LENGTH, MAX_LENGTH } = AUTH_CONFIG.PASSWORD;
    if (password.length < MIN_LENGTH) {
      throw new BadRequestException(
        `Password must be at least ${MIN_LENGTH} characters long (it has ${password.length})`
      );
    }
    if (password.length > MAX_LENGTH) {
      throw new BadRequestException(
        `Password must be at most ${MAX_LENGTH} characters long (it has ${password.length})`
      );
    }
  }
}
