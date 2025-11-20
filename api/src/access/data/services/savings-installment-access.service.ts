import { Injectable } from '@nestjs/common';
import { DatabaseColumns, TableEnum } from '../../../utility/enums';
import { BaseAccessService, DbContextService } from '.';
import {
  CreateSavingsInstallmentAccessRequest,
  ISavingsInstallmentAccessService,
  SavingsInstallmentAccessModel,
  UpdateSavingsInstallmentAccessRequest,
} from '../../contract/savings';
import { SavingsInstallmentEntity } from '../entities';

@Injectable()
export class SavingsInstallmentAccessService extends BaseAccessService implements ISavingsInstallmentAccessService
{
  constructor(dbContextService: DbContextService) {
    super(dbContextService);
  }

  public create = async (
    accessRequest: CreateSavingsInstallmentAccessRequest,
  ): Promise<SavingsInstallmentAccessModel> => {
    const entity = this.mapAccessRequestToEntity(accessRequest);
    const { data, error } = await this.dbContext
      .from(TableEnum.SavingsInstallments)
      .insert(entity)
      .select()
      .single<SavingsInstallmentEntity>();

    if (error) throw new Error(error.message);
    return this.mapEntityToAccessModel(data);
  };

  public createMany = async (
    accessRequests: CreateSavingsInstallmentAccessRequest[],
  ): Promise<SavingsInstallmentAccessModel[]> => {
    const entities = accessRequests.map(this.mapAccessRequestToEntity);
    const { data, error } = await this.dbContext
      .from(TableEnum.SavingsInstallments)
      .insert(entities)
      .select();

    if (error) throw new Error(error.message);
    return data?.map(this.mapEntityToAccessModel) || [];
  };

  public getById = async (id: number): Promise<SavingsInstallmentAccessModel> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.SavingsInstallments)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.EntityId, id)
      .single<SavingsInstallmentEntity>();

    if (error) throw new Error(error.message);
    return this.mapEntityToAccessModel(data);
  };

  public getBySavingsGoalId = async (
    savingsGoalId: number,
  ): Promise<SavingsInstallmentAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.SavingsInstallments)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.SavingsGoalId, savingsGoalId)
      .order(DatabaseColumns.InstallmentNumber, { ascending: true });

    if (error) throw new Error(error.message);
    return data?.map(this.mapEntityToAccessModel) || [];
  };

  public getByStatus = async (
    savingsGoalId: number,
    statusId: number,
  ): Promise<SavingsInstallmentAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.SavingsInstallments)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.SavingsGoalId, savingsGoalId)
      .eq(DatabaseColumns.StatusId, statusId)
      .order(DatabaseColumns.InstallmentNumber, { ascending: true });

    if (error) throw new Error(error.message);
    return data?.map(this.mapEntityToAccessModel) || [];
  };

  public getPendingInstallments = async (
    savingsGoalId: number,
  ): Promise<SavingsInstallmentAccessModel[]> => {
    return this.getByStatus(savingsGoalId, 1); // 1 = Pending
  };

  public update = async (
    accessRequest: UpdateSavingsInstallmentAccessRequest,
  ): Promise<SavingsInstallmentAccessModel> => {
    const entity = this.mapUpdateRequestToEntity(accessRequest);
    const { data, error } = await this.dbContext
      .from(TableEnum.SavingsInstallments)
      .upsert(entity)
      .select()
      .single<SavingsInstallmentEntity>();

    if (error) throw new Error(error.message);
    return this.mapEntityToAccessModel(data);
  };

  public markAsPaid = async (id: number, paidDate: Date): Promise<SavingsInstallmentAccessModel> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.SavingsInstallments)
      .update({
        [DatabaseColumns.StatusId]: 2, // 2 = Paid
        [DatabaseColumns.PaidDate]: paidDate.toISOString(),
      })
      .eq(DatabaseColumns.EntityId, id)
      .select()
      .single<SavingsInstallmentEntity>();

    if (error) throw new Error(error.message);
    return this.mapEntityToAccessModel(data);
  };

  public markAsSkipped = async (id: number): Promise<SavingsInstallmentAccessModel> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.SavingsInstallments)
      .update({ [DatabaseColumns.StatusId]: 3 }) // 3 = Skipped
      .eq(DatabaseColumns.EntityId, id)
      .select()
      .single<SavingsInstallmentEntity>();

    if (error) throw new Error(error.message);
    return this.mapEntityToAccessModel(data);
  };

  public delete = async (id: number): Promise<void> => {
    const { error } = await this.dbContext
      .from(TableEnum.SavingsInstallments)
      .delete()
      .eq(DatabaseColumns.EntityId, id);

    if (error) throw new Error(error.message);
  };

  public deleteAllBySavingsGoalId = async (savingsGoalId: number): Promise<void> => {
    const { error } = await this.dbContext
      .from(TableEnum.SavingsInstallments)
      .delete()
      .eq(DatabaseColumns.SavingsGoalId, savingsGoalId);

    if (error) throw new Error(error.message);
  };

  // Mappers privados
  private mapEntityToAccessModel = (entity: SavingsInstallmentEntity): SavingsInstallmentAccessModel => {
    return new SavingsInstallmentAccessModel(
      entity.id,
      entity.savingsgoalid,
      entity.installmentnumber,
      entity.amount,
      entity.statusid,
      entity.duedate ? new Date(entity.duedate) : null,
      entity.paiddate ? new Date(entity.paiddate) : null,
      new Date(entity.datecreated),
    );
  };

  private mapAccessRequestToEntity = (
    accessRequest: CreateSavingsInstallmentAccessRequest,
  ): SavingsInstallmentEntity => {
    return new SavingsInstallmentEntity(
      accessRequest.savingsGoalId,
      accessRequest.installmentNumber,
      accessRequest.amount,
      accessRequest.statusId,
      accessRequest.dueDate,
    );
  };

  private mapUpdateRequestToEntity = (accessRequest: UpdateSavingsInstallmentAccessRequest): SavingsInstallmentEntity => {
    const entity = new SavingsInstallmentEntity(
      accessRequest.savingsGoalId,
      accessRequest.installmentNumber,
      accessRequest.amount,
      accessRequest.statusId,
      accessRequest.dueDate,
      accessRequest.paidDate,
      accessRequest.dateCreated,
    );
    entity.id = accessRequest.id;
    return entity;
  };
}