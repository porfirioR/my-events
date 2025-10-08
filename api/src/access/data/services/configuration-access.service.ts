import { Injectable } from '@nestjs/common';
import { TableEnum, DatabaseColumns } from '../../../utility/enums';
import { TypeEntity } from '../entities/type.entity';
import { PeriodEntity } from '../entities/period.entity';
import { CurrencyEntity } from '../entities/currency.entity';
import { TypeAccessModel, PeriodAccessModel, CurrencyAccessModel } from '../../contract/configurations';
import { BaseAccessService, DbContextService } from '.';

@Injectable()
export class ConfigurationAccessService extends BaseAccessService {

  constructor(dbContextService: DbContextService) {
    super(dbContextService);
  }

  public getTypes = async (): Promise<TypeAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.Types)
      .select(DatabaseColumns.All)
    if (error) throw new Error(error.message);
    return data?.map(this.getTypeAccessModel);
  };

  public getPeriods = async (): Promise<PeriodAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.Periods)
      .select(DatabaseColumns.All)
    if (error) throw new Error(error.message);
    return data?.map(this.getPeriodAccessModel);
  };

  public getCurrencies = async (): Promise<CurrencyAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.Currencies)
      .select(DatabaseColumns.All)
    if (error) throw new Error(error.message);
    return data?.map(this.getCurrencyAccessModel);
  };

  private getTypeAccessModel = (accessRequest: TypeEntity): TypeAccessModel => new TypeAccessModel(
    accessRequest.id,
    accessRequest.name,
    accessRequest.description
  );

  private getPeriodAccessModel = (accessRequest: PeriodEntity): PeriodAccessModel => new PeriodAccessModel(
    accessRequest.id,
    accessRequest.name,
    accessRequest.quantity
  );

  private getCurrencyAccessModel = (accessRequest: CurrencyEntity): CurrencyAccessModel => new CurrencyAccessModel(
    accessRequest.id,
    accessRequest.name,
    accessRequest.symbol,
    accessRequest.country,
  );

}
