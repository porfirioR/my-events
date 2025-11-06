import { BadRequestException, Injectable } from '@nestjs/common';
import { TableEnum, DatabaseColumns } from '../../../utility/enums';
import { UserEntity } from '../entities/user.entity';
import {
  CreateUserAccessRequest,
  ResetUserAccessRequest,
  UserAccessModel,
  WebPushTokenAccessModel,
} from '../../../access/contract/users';
import { BaseAccessService, DbContextService } from '.';
import { WebPushTokenEntity } from '../entities';

@Injectable()
export class UserAccessService extends BaseAccessService {
  constructor(dbContextService: DbContextService) {
    super(dbContextService);
  }

  public getUsers = async (): Promise<UserAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.Users)
      .select(DatabaseColumns.All);
    if (error) throw new Error(error.message);
    return data.map(this.getUser);
  };

  public createUser = async (
    accessRequest: CreateUserAccessRequest
  ): Promise<UserAccessModel> => {
    const insertValue: Record<string, string | Date | boolean> = {
      [DatabaseColumns.Email]: accessRequest.email,
      [DatabaseColumns.DateCreated]: new Date(),
      [DatabaseColumns.Password]: accessRequest.password,
      [DatabaseColumns.IsEmailVerified]: false, // NUEVO
    };

    const { data, error } = await this.dbContext
      .from(TableEnum.Users)
      .insert(insertValue)
      .select()
      .single<UserEntity>();

    if (error) {
      if (error.code === '23505') {
        throw new BadRequestException(error.details);
      }
      throw new Error(error.message);
    }

    return this.getUser(data);
  };

  public resetPassword = async (accessRequest: ResetUserAccessRequest): Promise<UserAccessModel> => {
    const userEntity = await this.getUserByEmail(accessRequest.email);

    const { data, error } = await this.dbContext
      .from(TableEnum.Users)
      .update({ 
        [DatabaseColumns.Password]: accessRequest.password 
      })
      .eq(DatabaseColumns.EntityId, userEntity.id)
      .select()
      .single<UserEntity>();

    if (error) {
      if (error.code === '23505') {
        throw new BadRequestException(error.details);
      }
      throw new Error(error.message);
    }

    return this.getUser(data);
  };

  /**
   * Marca el email del usuario como verificado
   */
  public markEmailAsVerified = async (userId: number): Promise<UserAccessModel> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.Users)
      .update({
        [DatabaseColumns.IsEmailVerified]: true,
        [DatabaseColumns.EmailVerifiedAt]: new Date().toISOString(),
      })
      .eq(DatabaseColumns.EntityId, userId)
      .select()
      .single<UserEntity>();

    if (error) {
      throw new Error(error.message);
    }

    return this.getUser(data);
  };

  public getUserByEmail = async (email: string): Promise<UserAccessModel> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.Users)
      .select()
      .eq(DatabaseColumns.Email, email)
      .single<UserEntity>();

    if (error) throw new Error(error.message);
    return this.getUser(data);
  };

  public getUserById = async (id: number): Promise<UserAccessModel> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.Users)
      .select()
      .eq(DatabaseColumns.EntityId, id)
      .single<UserEntity>();

    if (error) throw new Error(error.message);
    return this.getUser(data);
  };
  public getWebPushToken = async (): Promise<WebPushTokenAccessModel> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.WebPushToken)
      .select()
      .single<WebPushTokenEntity>()
    if (error) throw new Error(error.message)
    return new WebPushTokenAccessModel(data.id, data.endpoint, data.expirationtime, JSON.parse(data.keys), data.email);
  }

  private getUser = (entity: UserEntity): UserAccessModel =>
    new UserAccessModel(
      entity.id,
      entity.email,
      entity.datecreated,
      entity.password,
      entity.isemailverified,
      entity.emailverifiedat
    );
}