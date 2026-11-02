import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PostgrestError } from '@supabase/supabase-js';
import { BaseAccessService, DbContextService } from '.';
import { DatabaseColumns, TableEnum } from '../../../utility/enums';
import {
  IAccountAccessService,
  AccountAccessModel,
  CreateAccountAccessRequest,
  UpdateAccountAccessRequest,
} from '../../contract/accounts';
import { AccountEntity } from '../entities/account.entity';

@Injectable()
export class AccountAccessService extends BaseAccessService implements IAccountAccessService {
  constructor(dbContextService: DbContextService) {
    super(dbContextService);
  }

  public create = async (request: CreateAccountAccessRequest): Promise<AccountAccessModel> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.Accounts)
      .insert({
        userid: request.userId,
        institutionid: request.institutionId,
        currencyid: request.currencyId,
        name: request.name,
        type: request.type,
        notes: request.notes,
      })
      .select()
      .single<AccountEntity>();

    if (error) throw this.mapWriteError(error);
    return this.mapEntityToModel(data);
  };

  public getById = async (id: number, userId: number): Promise<AccountAccessModel> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.Accounts)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.EntityId, id)
      .eq(DatabaseColumns.UserId, userId)
      .single<AccountEntity>();

    if (error) {
      if (error.code === 'PGRST116') throw new NotFoundException(`Account with id ${id} not found`);
      throw new InternalServerErrorException(error.message);
    }

    return this.mapEntityToModel(data);
  };

  public getAll = async (userId: number): Promise<AccountAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.Accounts)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.UserId, userId)
      .order(DatabaseColumns.EntityId, { ascending: true });

    if (error) throw new InternalServerErrorException(error.message);
    return (data as AccountEntity[] ?? []).map(this.mapEntityToModel);
  };

  public update = async (request: UpdateAccountAccessRequest): Promise<AccountAccessModel> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.Accounts)
      .update({
        institutionid: request.institutionId,
        currencyid: request.currencyId,
        name: request.name,
        type: request.type,
        isactive: request.isActive,
        notes: request.notes,
        dateupdated: new Date().toISOString(),
      })
      .eq(DatabaseColumns.EntityId, request.id)
      .eq(DatabaseColumns.UserId, request.userId)
      .select()
      .single<AccountEntity>();

    if (error) {
      if (error.code === 'PGRST116') throw new NotFoundException(`Account with id ${request.id} not found`);
      throw this.mapWriteError(error);
    }

    return this.mapEntityToModel(data);
  };

  // Los snapshots de la cuenta se borran en cascada
  public delete = async (id: number, userId: number): Promise<void> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.Accounts)
      .delete()
      .eq(DatabaseColumns.EntityId, id)
      .eq(DatabaseColumns.UserId, userId)
      .select(DatabaseColumns.EntityId);

    if (error) throw this.mapWriteError(error);
    if (!data?.length) throw new NotFoundException(`Account with id ${id} not found`);
  };

  private mapWriteError = (error: PostgrestError): Error => {
    if (error.code === '23505') return new ConflictException('An account with this name already exists');
    if (error.code === '23503') return new ConflictException('The institution or currency does not exist');
    return new InternalServerErrorException(error.message);
  };

  private mapEntityToModel = (entity: AccountEntity): AccountAccessModel =>
    new AccountAccessModel(
      entity.id,
      entity.userid,
      entity.institutionid,
      entity.currencyid,
      entity.name,
      entity.type,
      entity.isactive,
      entity.notes,
    );
}
