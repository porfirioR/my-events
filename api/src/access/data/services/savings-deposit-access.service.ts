import { Injectable } from '@nestjs/common';
import { DatabaseColumns, TableEnum } from '../../../utility/enums';
import { BaseAccessService, DbContextService } from '.';
import {
  CreateSavingsDepositAccessRequest,
  ISavingsDepositAccessService,
  SavingsDepositAccessModel,
} from '../../contract/savings';
import { SavingsDepositEntity } from '../entities';

@Injectable()
export class SavingsDepositAccessService
  extends BaseAccessService
  implements ISavingsDepositAccessService
{
  constructor(dbContextService: DbContextService) {
    super(dbContextService);
  }

  public create = async (accessRequest: CreateSavingsDepositAccessRequest): Promise<SavingsDepositAccessModel> => {
    const entity = this.mapAccessRequestToEntity(accessRequest);
    const { data, error } = await this.dbContext
      .from(TableEnum.SavingsDeposits)
      .insert(entity)
      .select()
      .single<SavingsDepositEntity>();

    if (error) throw new Error(error.message);
    return this.mapEntityToAccessModel(data);
  };

  public getById = async (id: number): Promise<SavingsDepositAccessModel> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.SavingsDeposits)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.EntityId, id)
      .single<SavingsDepositEntity>();

    if (error) throw new Error(error.message);
    return this.mapEntityToAccessModel(data);
  };

  public getBySavingsGoalId = async (savingsGoalId: number): Promise<SavingsDepositAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.SavingsDeposits)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.SavingsGoalId, savingsGoalId)
      .order(DatabaseColumns.DepositDate, { ascending: false });

    if (error) throw new Error(error.message);
    return data?.map(this.mapEntityToAccessModel) || [];
  };

  public getByInstallmentId = async (installmentId: number): Promise<SavingsDepositAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.SavingsDeposits)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.InstallmentId, installmentId)
      .order(DatabaseColumns.DepositDate, { ascending: false });

    if (error) throw new Error(error.message);
    return data?.map(this.mapEntityToAccessModel) || [];
  };

  public getFreeFormDeposits = async (savingsGoalId: number): Promise<SavingsDepositAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.SavingsDeposits)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.SavingsGoalId, savingsGoalId)
      .is(DatabaseColumns.InstallmentId, null)
      .order(DatabaseColumns.DepositDate, { ascending: false });

    if (error) throw new Error(error.message);
    return data?.map(this.mapEntityToAccessModel) || [];
  };

  public getTotalDepositedAmount = async (savingsGoalId: number): Promise<number> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.SavingsDeposits)
      .select(DatabaseColumns.Amount)
      .eq(DatabaseColumns.SavingsGoalId, savingsGoalId);

    if (error) throw new Error(error.message);

    const total = data?.reduce((sum, deposit) => sum + deposit.amount, 0) || 0;
    return total;
  };

  public delete = async (id: number): Promise<void> => {
    const { error } = await this.dbContext
      .from(TableEnum.SavingsDeposits)
      .delete()
      .eq(DatabaseColumns.EntityId, id);

    if (error) throw new Error(error.message);
  };

  // Mappers privados
  private mapEntityToAccessModel = (
    entity: SavingsDepositEntity
  ): SavingsDepositAccessModel => new SavingsDepositAccessModel(
    entity.id,
    entity.savingsgoalid,
    entity.amount,
    new Date(entity.depositdate),
    entity.installmentid ?? null,
    entity.description ?? null,
  );

  private mapAccessRequestToEntity = (
    accessRequest: CreateSavingsDepositAccessRequest
  ): SavingsDepositEntity => new SavingsDepositEntity(
    accessRequest.savingsGoalId,
    accessRequest.amount,
    accessRequest.depositDate,
    accessRequest.installmentId,
    accessRequest.description,
  );
}