import { Injectable } from '@nestjs/common';
import { DatabaseColumns, TableEnum } from '../../../utility/enums';
import { BaseAccessService, DbContextService } from '.';
import { ConfigurationBaseAccessModel, CurrencyAccessModel, IConfigurationAccessService, InstallmentStatusAccessModel, SavingsProgressionTypeAccessModel, SavingsStatusAccessModel } from '../../../access/contract/configurations';
import { ConfigurationBaseEntity, CurrencyEntity, InstallmentStatusEntity, SavingsProgressionTypeEntity, SavingsStatusEntity } from '../entities';


@Injectable()
export class ConfigurationAccessService extends BaseAccessService implements IConfigurationAccessService
{
  constructor(dbContextService: DbContextService) {
    super(dbContextService);
  }

  // ===== Savings Progression Types =====
  public getSavingsProgressionTypes = async (): Promise<SavingsProgressionTypeAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.SavingsProgressionTypes)
      .select<DatabaseColumns.All, SavingsProgressionTypeEntity>(DatabaseColumns.All)
      .order(DatabaseColumns.EntityId, { ascending: true });

    if (error) throw new Error(error.message);
    return data?.map(this.getEntityToAccessModel) || []
  };

  public getSavingsProgressionTypeById = async (id: number): Promise<SavingsProgressionTypeAccessModel> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.SavingsProgressionTypes)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.EntityId, id)
      .single<SavingsProgressionTypeEntity>();

    if (error) throw new Error(error.message);
    return this.getEntityToAccessModel(data);
  };

  // ===== Savings Statuses =====
  public getSavingsStatuses = async (): Promise<SavingsStatusAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.SavingsStatus)
      .select<DatabaseColumns.All, SavingsStatusEntity>(DatabaseColumns.All)
      .order(DatabaseColumns.EntityId, { ascending: true });

    if (error) throw new Error(error.message);
    return data?.map(this.getEntityToAccessModel) || [];
  };

  public getSavingsStatusById = async (id: number): Promise<SavingsStatusAccessModel> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.SavingsStatus)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.EntityId, id)
      .single<SavingsStatusEntity>();

    if (error) throw new Error(error.message);
    return this.getEntityToAccessModel(data);
  };

  // ===== Installment Statuses =====
  public getInstallmentStatuses = async (): Promise<InstallmentStatusAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.InstallmentStatus)
      .select<DatabaseColumns.All, InstallmentStatusEntity>(DatabaseColumns.All)
      .order(DatabaseColumns.EntityId, { ascending: true });

    if (error) throw new Error(error.message);
    return data?.map(this.getEntityToAccessModel) || [];
  };

  public getInstallmentStatusById = async (id: number): Promise<InstallmentStatusAccessModel> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.InstallmentStatus)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.EntityId, id)
      .single<InstallmentStatusEntity>();

    if (error) throw new Error(error.message);
    return this.getEntityToAccessModel(data);
  };

  // ===== Currencies =====
  public getCurrencies = async (): Promise<CurrencyAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.Currencies)
      .select<DatabaseColumns.All, CurrencyEntity>(DatabaseColumns.All)
      .order(DatabaseColumns.EntityId, { ascending: true });

    if (error) throw new Error(error.message);
    return data?.map(this.getCurrencyAccessModel) || []
  };

  public getCurrencyById = async (id: number): Promise<CurrencyAccessModel> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.Currencies)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.EntityId, id)
      .single<CurrencyEntity>();

    if (error) throw new Error(error.message);
    return this.getCurrencyAccessModel(data);
  };

  // ===== Private methods =====
  private getEntityToAccessModel = (entity: ConfigurationBaseEntity): ConfigurationBaseAccessModel => new ConfigurationBaseAccessModel(
    entity.id,
    entity.name,
    entity.description
  );

  private getCurrencyAccessModel = (entity: CurrencyEntity): CurrencyAccessModel => new CurrencyAccessModel(
    entity.id,
    entity.name,
    entity.symbol,
    entity.country,
    entity.locale,
    entity.currencycode,
    entity.minimumdecimal
  );
}