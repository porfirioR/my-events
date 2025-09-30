import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { TableEnum, DatabaseColumns } from '../../../utility/enums';
import { DbContextService } from '../../data/services/db-context.service';

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

@Injectable()
export class UserAccessService {
  private userContext: SupabaseClient<any, 'public', any>;
  private databaseColumns = DatabaseColumns

  constructor(private dbContextService: DbContextService) {
    this.userContext = this.dbContextService.getConnection();
  }

  public getUsers = async (): Promise<UserAccessModel[]> => {
    const { data, error } = await this.userContext
      .from(TableEnum.Users)
      .select(this.databaseColumns.All);
    if (error) throw new Error(error.message);
    return data.map(this.getUser);
  };

  public createUser = async (accessRequest: CreateUserAccessRequest): Promise<UserAccessModel> => {
    const insertValue: Record<string, string | Date> = {
      [this.databaseColumns.Email]: accessRequest.email,
      [this.databaseColumns.DateCreated]: new Date(),
      [this.databaseColumns.Password]: accessRequest.password
    };
    const { data, error } = await this.userContext
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
    const { data, error } = await this.userContext
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
    const { data } = await this.userContext
      .from(TableEnum.WebPushToken)
      .select()
      .returns<WebPushTokenEntity[]>();

    if (data.length) {
      const webPush = data.find(x => x.email === accessRequest.email)
      if (!webPush) {
        return await this.insertWebPushToken(accessRequest)
      }
      const result = await this.userContext
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
    const { data, error } = await this.userContext
      .from(TableEnum.WebPushToken)
      .select()
      .single<WebPushTokenEntity>()
    if (error) throw new Error(error.message)
    return new WebPushTokenAccessModel(data.id, data.endpoint, data.expirationtime, JSON.parse(data.keys), data.email);
  };

  public addForgotCodePassword = async (accessRequest: ForgotPasswordAccessRequest): Promise<UserAccessModel> => {
    const userEntity = await this.getUserByEmail(accessRequest.email);
    const { data, error } = await this.userContext
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
    const { data, error } = await this.userContext
      .from(TableEnum.Users)
      .select()
      .eq(this.databaseColumns.Email, email)
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
      [this.databaseColumns.Endpoint]: accessRequest.endpoint,
      [this.databaseColumns.Email]: accessRequest.email,
      [this.databaseColumns.ExpirationTime]: null,
      [this.databaseColumns.Keys]: JSON.stringify(accessRequest.keys)
    };
    const result = await this.userContext
      .from(TableEnum.WebPushToken)
      .insert(insertValue)
      .select()
      .single<WebPushTokenEntity>();
    return new WebPushTokenAccessModel(result.data.id, accessRequest.endpoint, accessRequest.expirationTime, accessRequest.keys, accessRequest.email);
  }
}
