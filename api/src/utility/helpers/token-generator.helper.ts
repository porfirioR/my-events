import * as crypto from 'crypto';

export class TokenGenerator {
  /**
   * Genera un token seguro usando crypto
   */
  static generateSecureToken(length: number = 64): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Calcula la fecha de expiración
   */
  static calculateExpiry(hours?: number, days?: number): Date {
    const expiry = new Date();
    if (hours) {
      expiry.setHours(expiry.getHours() + hours);
    }
    if (days) {
      expiry.setDate(expiry.getDate() + days);
    }
    return expiry;
  }

  /**
   * Verifica si un token ha expirado
   */
  static isTokenExpired(expiresAt: Date): boolean {
    return new Date() > new Date(expiresAt);
  }
}
