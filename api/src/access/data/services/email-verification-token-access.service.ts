import { Injectable } from '@nestjs/common';
import { BaseAccessService } from './base-access.service';
import { DbContextService } from './db-context.service';
import { TableEnum, DatabaseColumns } from '../../../utility/enums';
import { EmailVerificationTokenEntity } from '../entities/email-verification-token.entity';
import {
  EmailVerificationTokenAccessModel,
  CreateEmailVerificationTokenRequest,
} from '../../contract/tokens';

@Injectable()
export class EmailVerificationTokenAccessService extends BaseAccessService {
  constructor(dbContextService: DbContextService) {
    super(dbContextService);
  }

  /**
   * Crea un nuevo token de verificación de email
   */
  public createToken = async (
    request: CreateEmailVerificationTokenRequest
  ): Promise<EmailVerificationTokenAccessModel> => {
    const insertValue: Record<string, any> = {
      [DatabaseColumns.UserId]: request.userId,
      [DatabaseColumns.Token]: request.token,
      [DatabaseColumns.ExpiresAt]: request.expiresAt.toISOString(),
      [DatabaseColumns.CreatedAt]: new Date().toISOString(),
    };

    const { data, error } = await this.dbContext
      .from(TableEnum.EmailVerificationTokens)
      .insert(insertValue)
      .select()
      .single<EmailVerificationTokenEntity>();

    if (error) {
      throw new Error(error.message);
    }

    return this.mapToModel(data);
  };

  /**
   * Obtiene un token válido (no verificado y no expirado)
   */
  public getValidToken = async (
    token: string
  ): Promise<EmailVerificationTokenAccessModel | null> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.EmailVerificationTokens)
      .select()
      .eq(DatabaseColumns.Token, token)
      .eq(DatabaseColumns.IsVerified, false)
      .single<EmailVerificationTokenEntity>();

    if (error || !data) {
      return null;
    }

    // Verificar si el token ha expirado
    if (new Date() > new Date(data.expiresat)) {
      return null;
    }

    return this.mapToModel(data);
  };

  /**
   * Marca un token como verificado
   */
  public markTokenAsVerified = async (tokenId: number): Promise<void> => {
    const { error } = await this.dbContext
      .from(TableEnum.EmailVerificationTokens)
      .update({
        [DatabaseColumns.IsVerified]: true,
        [DatabaseColumns.VerifiedAt]: new Date().toISOString(),
      })
      .eq(DatabaseColumns.EntityId, tokenId);

    if (error) {
      throw new Error(error.message);
    }
  };

  /**
   * Invalida todos los tokens de verificación de un usuario
   */
  public invalidateUserTokens = async (userId: number): Promise<void> => {
    const { error } = await this.dbContext
      .from(TableEnum.EmailVerificationTokens)
      .update({ [DatabaseColumns.IsVerified]: true })
      .eq(DatabaseColumns.UserId, userId)
      .eq(DatabaseColumns.IsVerified, false);

    if (error) {
      throw new Error(error.message);
    }
  };

  /**
   * Cuenta intentos recientes de reenvío de un usuario
   */
  public countRecentAttempts = async (
    userId: number,
    hoursAgo: number = 1
  ): Promise<number> => {
    const timeThreshold = new Date();
    timeThreshold.setHours(timeThreshold.getHours() - hoursAgo);

    const { data, error } = await this.dbContext
      .from(TableEnum.EmailVerificationTokens)
      .select(DatabaseColumns.EntityId, { count: 'exact' })
      .eq(DatabaseColumns.UserId, userId)
      .gte(DatabaseColumns.CreatedAt, timeThreshold.toISOString());

    if (error) {
      throw new Error(error.message);
    }

    return data?.length || 0;
  };

  /**
   * Obtiene el último token de un usuario (para debugging)
   */
  public getLatestTokenByUserId = async (
    userId: number
  ): Promise<EmailVerificationTokenAccessModel | null> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.EmailVerificationTokens)
      .select()
      .eq(DatabaseColumns.UserId, userId)
      .order(DatabaseColumns.CreatedAt, { ascending: false })
      .limit(1)
      .single<EmailVerificationTokenEntity>();

    if (error || !data) {
      return null;
    }

    return this.mapToModel(data);
  };

  /**
   * Limpia tokens expirados (para ejecutar en cron job)
   */
  public cleanupExpiredTokens = async (): Promise<number> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.EmailVerificationTokens)
      .delete()
      .lt(DatabaseColumns.ExpiresAt, new Date().toISOString())
      .select(DatabaseColumns.EntityId);

    if (error) {
      throw new Error(error.message);
    }

    return data?.length || 0;
  };

  private mapToModel = (
    entity: EmailVerificationTokenEntity
  ): EmailVerificationTokenAccessModel => {
    return new EmailVerificationTokenAccessModel(
      entity.id,
      entity.userid,
      entity.token,
      new Date(entity.expiresat),
      entity.isverified,
      new Date(entity.createdat),
      entity.verifiedat ? new Date(entity.verifiedat) : null
    );
  };
}