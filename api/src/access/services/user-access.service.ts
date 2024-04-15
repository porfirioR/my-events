import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { DbContextService } from './db-context.service';
import { CreateUserAccessRequest } from '../contract/users/create-user-access-request';
import { UserAccessModel } from '../contract/users/user-access-model';
import { UserEntity } from '../contract/entities/user.entity';
import { TableEnum, DatabaseColumns } from '../../utility/enums';
import { ForgotPasswordAccessRequest } from '../contract/users/forgot-password-access-request';
import { ResetUserAccessRequest } from '../contract/users/reset-user-password-access-request';

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

  public addForgotCodePassword = async (accessRequest: ForgotPasswordAccessRequest): Promise<UserAccessModel> => {
    const userEntity = await this.getUserByEmail(accessRequest.email);
    const { data, error } = await this.userContext
      .from(TableEnum.Users)
      .upsert({ id: userEntity.id, code: accessRequest.code })
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
}
