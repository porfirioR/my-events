import { Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { CreateSavingAccessRequest, SavingAccessModel, UpdateSavingAccessRequest } from '../../contract/savings';
import { DbContextService } from './db-context.service';
import { DatabaseColumns, TableEnum } from '../../../utility/enums';
import { SavingEntity } from '../entities/saving.entity';

@Injectable()
export class SavingAccessService {
  private dbtContext: SupabaseClient<any, 'public', any>;

  constructor(private dbContextService: DbContextService) {
    this.dbtContext = this.dbContextService.getConnection();
  }

  public create = async (accessRequest: CreateSavingAccessRequest): Promise<SavingAccessModel> => {
    const entity = this.mapAccessRequestToEntity(accessRequest);
    const event  = await this.dbtContext
      .from(TableEnum.Savings)
      .insert(entity)
      .select()
      .single<SavingEntity>();
    if (event.error) throw new Error(event.error.message);
    return this.mapEntityToAccessModel(event.data);
  };

  public getMySavings = async (authorId: number, id: number): Promise<SavingAccessModel[]> => {
    const { data, error } = await this.dbtContext
      .from(TableEnum.Savings)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.AuthorId, authorId)
      .eq(DatabaseColumns.EntityId, id)
      .order('date', {ascending: false});
    if (error) throw new Error(error.message);
    return data?.map(this.mapEntityToAccessModel);
  };

  public updateSaving = async (accessRequest: UpdateSavingAccessRequest): Promise<SavingAccessModel> => {
    const eventEntity = this.mapAccessRequestToEntity(accessRequest);
    const event = await this.dbtContext
      .from(TableEnum.Savings)
      .upsert(eventEntity)
      .select()
      .single<SavingEntity>();
    if (event.error) throw new Error(event.error.message);
    return this.mapEntityToAccessModel(event.data);
  };

  private mapEntityToAccessModel = (entity: SavingEntity): SavingAccessModel => new SavingAccessModel(
    entity.id,
    entity.isactive,
    entity.name,
    entity.description,
    entity.date,
    entity.savingtypeid,
    entity.currencyid,
    entity.userid,
    entity.periodid,
    entity.totalamount,
    entity.numberofpayment
  );

  private mapAccessRequestToEntity = (accessRequest: CreateSavingAccessRequest | UpdateSavingAccessRequest): SavingEntity => {
    const eventEntity = new SavingEntity(
      accessRequest.name,
      accessRequest.description,
      true,
      accessRequest.date,
      accessRequest.savingTypeId,
      accessRequest.currencyId,
      accessRequest.userId,
      accessRequest.periodId,
      accessRequest.totalAmount,
      accessRequest.numberOfPayment,
      accessRequest.customPeriodQuantity
    );
    if (accessRequest instanceof UpdateSavingAccessRequest) {
      eventEntity.id = accessRequest.id
      eventEntity.isactive = accessRequest.isActive
    }
    return eventEntity
  };

}
