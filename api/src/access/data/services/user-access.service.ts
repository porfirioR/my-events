import { BadRequestException, Injectable } from '@nestjs/common';
import { TableEnum, DatabaseColumns } from '../../../utility/enums';
import { UserEntity } from '../entities/user.entity';
import { WebPushTokenEntity } from '../entities/web-push-token.Entity';
import {
  CreateUserAccessRequest,
  ForgotPasswordAccessRequest,
  ResetUserAccessRequest,
  UserAccessModel,
  WebPushTokenAccessModel,
  WebPushTokenAccessRequest
} from '../../../access/contract/users';
import { BaseAccessService, DbContextService } from '.';

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

  public createUser = async (accessRequest: CreateUserAccessRequest): Promise<UserAccessModel> => {
    const insertValue: Record<string, string | Date> = {
      [DatabaseColumns.Email]: accessRequest.email,
      [DatabaseColumns.DateCreated]: new Date(),
      [DatabaseColumns.Password]: accessRequest.password
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
    const userEntity = await this.getUserByEmail(accessRequest.email)
    const { data, error } = await this.dbContext
      .from(TableEnum.Users)
      .upsert({ id: userEntity.id, code: null, password: accessRequest.password })
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

  public saveToken = async (accessRequest: WebPushTokenAccessRequest): Promise<WebPushTokenAccessModel> => {
    const { data } = await this.dbContext
      .from(TableEnum.WebPushToken)
      .select()
      .returns<WebPushTokenEntity[]>();

    if (data.length) {
      const webPush = data.find(x => x.email === accessRequest.email)
      if (!webPush) {
        return await this.insertWebPushToken(accessRequest)
      }
      const result = await this.dbContext
        .from(TableEnum.WebPushToken)
        .upsert({ id: webPush.id, endpoint: accessRequest.endpoint, expirationtime: accessRequest.expirationTime, keys: JSON.stringify(accessRequest.keys), email: accessRequest.email })
        .select()
        .single<WebPushTokenEntity>();
      if (result.error) {
        throw new Error(result.error.message);
      }
      return new WebPushTokenAccessModel(result.data.id, accessRequest.endpoint, accessRequest.expirationTime, accessRequest.keys, accessRequest.email);
    } else {
      return await this.insertWebPushToken(accessRequest)
    }
  };

  public getWebPushToken = async (): Promise<WebPushTokenAccessModel> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.WebPushToken)
      .select()
      .single<WebPushTokenEntity>()
    if (error) throw new Error(error.message)
    return new WebPushTokenAccessModel(data.id, data.endpoint, data.expirationtime, JSON.parse(data.keys), data.email);
  };

  public addForgotCodePassword = async (accessRequest: ForgotPasswordAccessRequest): Promise<UserAccessModel> => {
    const userEntity = await this.getUserByEmail(accessRequest.email);
    const { data, error } = await this.dbContext
      .from(TableEnum.Users)
      .update({ code: accessRequest.code })
      .eq('id', userEntity.id)
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

  public getUserByEmail = async (email: string): Promise<UserAccessModel> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.Users)
      .select()
      .eq(DatabaseColumns.Email, email)
      .single<UserEntity>();
    if (error) throw new Error(error.message);
    return this.getUser(data);
  };

  private getUser = (entity: UserEntity): UserAccessModel => new UserAccessModel(
    entity.id,
    entity.email,
    entity.datecreated,
    entity.password,
    entity.code
  );

  private insertWebPushToken = async (accessRequest: WebPushTokenAccessRequest): Promise<WebPushTokenAccessModel> => {
    const insertValue: Record<string, string | Date> = {
      [DatabaseColumns.Endpoint]: accessRequest.endpoint,
      [DatabaseColumns.Email]: accessRequest.email,
      [DatabaseColumns.ExpirationTime]: null,
      [DatabaseColumns.Keys]: JSON.stringify(accessRequest.keys)
    };
    const result = await this.dbContext
      .from(TableEnum.WebPushToken)
      .insert(insertValue)
      .select()
      .single<WebPushTokenEntity>();
    return new WebPushTokenAccessModel(result.data.id, accessRequest.endpoint, accessRequest.expirationTime, accessRequest.keys, accessRequest.email);
  }
}
