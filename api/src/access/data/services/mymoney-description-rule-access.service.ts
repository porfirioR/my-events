import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PostgrestError } from '@supabase/supabase-js';
import { BaseAccessService, DbContextService } from '.';
import { DatabaseColumns, TableEnum } from '../../../utility/enums';
import {
  IMyMoneyDescriptionRuleAccessService,
  MyMoneyDescriptionRuleAccessModel,
  MyMoneyLinkTarget,
  UpsertMyMoneyDescriptionRuleAccessRequest,
} from '../../contract/mymoney';
import { MyMoneyDescriptionRuleEntity } from '../entities/mymoney-description-rule.entity';

@Injectable()
export class MyMoneyDescriptionRuleAccessService extends BaseAccessService implements IMyMoneyDescriptionRuleAccessService {
  constructor(dbContextService: DbContextService) {
    super(dbContextService);
  }

  public getAll = async (userId: number): Promise<MyMoneyDescriptionRuleAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.MyMoneyDescriptionRules)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.UserId, userId)
      .order('pattern', { ascending: true });

    if (error) throw new InternalServerErrorException(error.message);
    return (data as MyMoneyDescriptionRuleEntity[] ?? []).map(this.mapEntityToModel);
  };

  public create = async (request: UpsertMyMoneyDescriptionRuleAccessRequest): Promise<MyMoneyDescriptionRuleAccessModel> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.MyMoneyDescriptionRules)
      .insert({ userid: request.userId, ...this.mapRequestToColumns(request) })
      .select()
      .single<MyMoneyDescriptionRuleEntity>();

    if (error) throw this.mapWriteError(error);
    return this.mapEntityToModel(data);
  };

  public update = async (request: UpsertMyMoneyDescriptionRuleAccessRequest): Promise<MyMoneyDescriptionRuleAccessModel> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.MyMoneyDescriptionRules)
      .update({ ...this.mapRequestToColumns(request), dateupdated: new Date().toISOString() })
      .eq(DatabaseColumns.EntityId, request.id)
      .eq(DatabaseColumns.UserId, request.userId)
      .select()
      .maybeSingle<MyMoneyDescriptionRuleEntity>();

    if (error) throw this.mapWriteError(error);
    if (!data) throw new NotFoundException(`Description rule with id ${request.id} not found`);
    return this.mapEntityToModel(data);
  };

  public delete = async (id: number, userId: number): Promise<void> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.MyMoneyDescriptionRules)
      .delete()
      .eq(DatabaseColumns.EntityId, id)
      .eq(DatabaseColumns.UserId, userId)
      .select(DatabaseColumns.EntityId);

    if (error) throw new InternalServerErrorException(error.message);
    if (!data?.length) throw new NotFoundException(`Description rule with id ${id} not found`);
  };

  private mapRequestToColumns = (request: UpsertMyMoneyDescriptionRuleAccessRequest) => ({
    pattern: request.pattern,
    accountid: request.target.accountId,
    savingsgoalid: request.target.savingsGoalId,
    loanid: request.target.loanId,
  });

  private mapWriteError = (error: PostgrestError): Error => {
    if (error.code === '23505') return new ConflictException('A description rule with this pattern already exists');
    return new InternalServerErrorException(error.message);
  };

  private mapEntityToModel = (entity: MyMoneyDescriptionRuleEntity): MyMoneyDescriptionRuleAccessModel =>
    new MyMoneyDescriptionRuleAccessModel(
      entity.id,
      entity.userid,
      entity.pattern,
      new MyMoneyLinkTarget(entity.accountid, entity.savingsgoalid, entity.loanid),
    );
}
