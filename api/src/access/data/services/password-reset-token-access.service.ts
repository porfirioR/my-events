// src/access/data/services/password-reset-token-access.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { BaseAccessService } from './base-access.service';
import { DbContextService } from './db-context.service';
import { TableEnum, DatabaseColumns } from '../../../utility/enums';
import { PasswordResetTokenEntity } from '../entities/password-reset-token.entity';
import { CreatePasswordResetTokenRequest, PasswordResetTokenAccessModel } from '../../../access/contract/tokens';


@Injectable()
export class PasswordResetTokenAccessService extends BaseAccessService {
  constructor(dbContextService: DbContextService) {
    super(dbContextService);
  }

  /**
   * Crea un nuevo token de reset de contraseña
   */
  public createToken = async ( request: CreatePasswordResetTokenRequest): Promise<PasswordResetTokenAccessModel> => {
    const insertValue: Record<string, any> = {
      [DatabaseColumns.UserId]: request.userId,
      [DatabaseColumns.Token]: request.token,
      [DatabaseColumns.ExpiresAt]: request.expiresAt.toISOString(),
      [DatabaseColumns.IpAddress]: request.ipAddress || null,
      [DatabaseColumns.CreatedAt]: new Date().toISOString(),
    };

    const { data, error } = await this.dbContext
      .from(TableEnum.PasswordResetTokens)
      .insert(insertValue)
      .select()
      .single<PasswordResetTokenEntity>();

    if (error) {
      throw new Error(error.message);
    }

    return this.mapToModel(data);
  };

  /**
   * Invalida todos los tokens activos de un usuario
   */
  public invalidateUserTokens = async (userId: number): Promise<void> => {
    const { error } = await this.dbContext
      .from(TableEnum.PasswordResetTokens)
      .update({ [DatabaseColumns.IsUsed]: true })
      .eq(DatabaseColumns.UserId, userId)
      .eq(DatabaseColumns.IsUsed, false);

    if (error) {
      throw new Error(error.message);
    }
  };

  /**
   * Obtiene un token válido (no usado y no expirado)
   */
  public getValidToken = async (token: string): Promise<PasswordResetTokenAccessModel | null> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.PasswordResetTokens)
      .select()
      .eq(DatabaseColumns.Token, token)
      .eq(DatabaseColumns.IsUsed, false)
      .single<PasswordResetTokenEntity>();

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
   * Marca un token como usado
   */
  public markTokenAsUsed = async (tokenId: number): Promise<void> => {
    const { error } = await this.dbContext
      .from(TableEnum.PasswordResetTokens)
      .update({
        [DatabaseColumns.IsUsed]: true,
        [DatabaseColumns.UsedAt]: new Date().toISOString(),
      })
      .eq(DatabaseColumns.EntityId, tokenId);

    if (error) {
      throw new Error(error.message);
    }
  };

  /**
   * Cuenta intentos recientes de reset de un usuario
   */
  public countRecentAttempts = async (
    userId: number,
    hoursAgo: number = 1
  ): Promise<number> => {
    const timeThreshold = new Date();
    timeThreshold.setHours(timeThreshold.getHours() - hoursAgo);

    const { data, error } = await this.dbContext
      .from(TableEnum.PasswordResetTokens)
      .select(DatabaseColumns.EntityId, { count: 'exact' })
      .eq(DatabaseColumns.UserId, userId)
      .gte(DatabaseColumns.CreatedAt, timeThreshold.toISOString());

    if (error) {
      throw new Error(error.message);
    }

    return data?.length || 0;
  };

  /**
   * Limpia tokens expirados (para ejecutar en cron job)
   */
  public cleanupExpiredTokens = async (): Promise<number> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.PasswordResetTokens)
      .delete()
      .lt(DatabaseColumns.ExpiresAt, new Date().toISOString())
      .select(DatabaseColumns.EntityId);

    if (error) {
      throw new Error(error.message);
    }

    return data?.length || 0;
  };

  private mapToModel = (entity: PasswordResetTokenEntity): PasswordResetTokenAccessModel => {
    return new PasswordResetTokenAccessModel(
      entity.id,
      entity.userid,
      entity.token,
      new Date(entity.expiresat),
      entity.isused,
      new Date(entity.createdat),
      entity.usedat ? new Date(entity.usedat) : null,
      entity.ipaddress
    );
  };
}