
import { Injectable } from '@nestjs/common';
import { DatabaseColumns, TableEnum } from '../../../utility/enums';
import { BaseAccessService, DbContextService } from '.';
import {
  CreateSavingsGoalAccessRequest,
  ISavingsGoalAccessService,
  SavingsGoalAccessModel,
  UpdateSavingsGoalAccessRequest,
} from '../../contract/savings';
import { SavingsGoalEntity } from '../entities';

@Injectable()
export class SavingsGoalAccessService extends BaseAccessService implements ISavingsGoalAccessService
{
  constructor(dbContextService: DbContextService) {
    super(dbContextService);
  }

  public create = async (accessRequest: CreateSavingsGoalAccessRequest): Promise<SavingsGoalAccessModel> => {
    const entity = this.mapAccessRequestToEntity(accessRequest);
    const { data, error } = await this.dbContext
      .from(TableEnum.SavingsGoals)
      .insert(entity)
      .select()
      .single<SavingsGoalEntity>();

    if (error) throw new Error(error.message);
    return this.mapEntityToAccessModel(data);
  };

  public getById = async (id: number, userId: number): Promise<SavingsGoalAccessModel> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.SavingsGoals)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.EntityId, id)
      .eq(DatabaseColumns.UserId, userId)
      .single<SavingsGoalEntity>();

    if (error) throw new Error(error.message);
    return this.mapEntityToAccessModel(data);
  };

  public getAll = async (userId: number): Promise<SavingsGoalAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.SavingsGoals)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.UserId, userId)
      .order(DatabaseColumns.DateCreated, { ascending: false });

    if (error) throw new Error(error.message);
    return data?.map(this.mapEntityToAccessModel) || [];
  };

  public getByStatus = async (userId: number, statusId: number): Promise<SavingsGoalAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.SavingsGoals)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.UserId, userId)
      .eq('statusid', statusId)
      .order(DatabaseColumns.DateCreated, { ascending: false });

    if (error) throw new Error(error.message);
    return data?.map(this.mapEntityToAccessModel) || [];
  };

  public update = async (accessRequest: UpdateSavingsGoalAccessRequest): Promise<SavingsGoalAccessModel> => {
    const entity = this.mapUpdateRequestToEntity(accessRequest);
    const { data, error } = await this.dbContext
      .from(TableEnum.SavingsGoals)
      .upsert(entity)
      .select()
      .single<SavingsGoalEntity>();

    if (error) throw new Error(error.message);
    return this.mapEntityToAccessModel(data);
  };

  public updateCurrentAmount = async (
    id: number,
    userId: number,
    newAmount: number,
  ): Promise<SavingsGoalAccessModel> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.SavingsGoals)
      .update({ 
        currentamount: newAmount,
        dateupdated: new Date().toISOString(),
      })
      .eq(DatabaseColumns.EntityId, id)
      .eq(DatabaseColumns.UserId, userId)
      .select()
      .single<SavingsGoalEntity>();

    if (error) throw new Error(error.message);
    return this.mapEntityToAccessModel(data);
  };

  public updateStatus = async (
    id: number,
    userId: number,
    statusId: number,
  ): Promise<SavingsGoalAccessModel> => {
    const updateData: any = { 
      statusid: statusId,
      dateupdated: new Date().toISOString(),
    };

    // Si el estado es "Completed" (2), agregar fecha de completado
    if (statusId === 2) {
      updateData.completeddate = new Date().toISOString();
    }

    const { data, error } = await this.dbContext
      .from(TableEnum.SavingsGoals)
      .update(updateData)
      .eq(DatabaseColumns.EntityId, id)
      .eq(DatabaseColumns.UserId, userId)
      .select()
      .single<SavingsGoalEntity>();

    if (error) throw new Error(error.message);
    return this.mapEntityToAccessModel(data);
  };

  public markAsCompleted = async (id: number, userId: number): Promise<SavingsGoalAccessModel> => {
    return this.updateStatus(id, userId, 2); // 2 = Completed
  };

  public delete = async (id: number, userId: number): Promise<void> => {
    const { error } = await this.dbContext
      .from(TableEnum.SavingsGoals)
      .delete()
      .eq(DatabaseColumns.EntityId, id)
      .eq(DatabaseColumns.UserId, userId);

    if (error) throw new Error(error.message);
  };

  public getStats = async (userId: number): Promise<{
    total: number;
    active: number;
    completed: number;
    paused: number;
    cancelled: number;
  }> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.SavingsGoals)
      .select('id, statusid')
      .eq(DatabaseColumns.UserId, userId);

    if (error) throw new Error(error.message);

    const total = data?.length || 0;
    const active = data?.filter((item) => item.statusid === 1).length || 0;
    const completed = data?.filter((item) => item.statusid === 2).length || 0;
    const paused = data?.filter((item) => item.statusid === 3).length || 0;
    const cancelled = data?.filter((item) => item.statusid === 4).length || 0;

    return {
      total,
      active,
      completed,
      paused,
      cancelled,
    };
  };

  // Mappers privados
  private mapEntityToAccessModel = (
    entity: SavingsGoalEntity,
  ): SavingsGoalAccessModel => {
    return new SavingsGoalAccessModel(
      entity.id,
      entity.userid,
      entity.currencyid,
      entity.name,
      entity.targetamount,
      entity.currentamount ?? 0,
      entity.progressiontypeid,
      entity.statusid,
      new Date(entity.startdate),
      entity.description ?? null,
      entity.numberofinstallments ?? null,
      entity.baseamount ?? null,
      entity.incrementamount ?? null,
      entity.expectedenddate ? new Date(entity.expectedenddate) : null,
      entity.completeddate ? new Date(entity.completeddate) : null,
      new Date(entity.datecreated),
      new Date(entity.dateupdated),
    );
  };

  private mapAccessRequestToEntity = (accessRequest: CreateSavingsGoalAccessRequest): SavingsGoalEntity => {
    return new SavingsGoalEntity(
      accessRequest.userId,
      accessRequest.currencyId,
      accessRequest.name,
      accessRequest.targetAmount,
      accessRequest.progressionTypeId,
      1, // Default: Active
      accessRequest.startDate,
      accessRequest.description,
      0, // currentAmount = 0 al crear
      accessRequest.numberOfInstallments,
      accessRequest.baseAmount,
      accessRequest.incrementAmount,
      accessRequest.expectedEndDate,
    );
  };

  private mapUpdateRequestToEntity = (accessRequest: UpdateSavingsGoalAccessRequest): SavingsGoalEntity => {
    const entity = new SavingsGoalEntity(
      accessRequest.userId,
      accessRequest.currencyId,
      accessRequest.name,
      accessRequest.targetAmount,
      accessRequest.progressionTypeId,
      accessRequest.statusId,
      accessRequest.startDate,
      accessRequest.description,
      accessRequest.currentAmount,
      accessRequest.numberOfInstallments,
      accessRequest.baseAmount,
      accessRequest.incrementAmount,
      accessRequest.expectedEndDate,
      accessRequest.completedDate,
      accessRequest.dateCreated,
      accessRequest.dateUpdated,
    );
    entity.id = accessRequest.id;
    return entity;
  };
}