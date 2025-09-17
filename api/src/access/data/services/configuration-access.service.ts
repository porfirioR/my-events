import { Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { DbContextService } from './db-context.service';
import { TableEnum, DatabaseColumns } from '../../../utility/enums';
import { TypeEntity } from '../entities/type.entity';
import { PeriodEntity } from '../entities/period.entity';
import { CurrencyEntity } from '../entities/currency.entity';
import { TypeAccessModel, PeriodAccessModel, CurrencyAccessModel } from '../../contract/configurations';

@Injectable()
export class ConfigurationAccessService {
  private eventContext: SupabaseClient<any, 'public', any>;

  constructor(private dbContextService: DbContextService) {
    this.eventContext = this.dbContextService.getConnection();
  }

  public getTypes = async (): Promise<TypeAccessModel[]> => {
    const { data, error } = await this.eventContext
      .from(TableEnum.Types)
      .select(DatabaseColumns.All)
    if (error) throw new Error(error.message);
    return data?.map(this.getTypeAccessModel);
  };

  public getPeriods = async (): Promise<PeriodAccessModel[]> => {
    const { data, error } = await this.eventContext
      .from(TableEnum.Periods)
      .select(DatabaseColumns.All)
    if (error) throw new Error(error.message);
    return data?.map(this.getPeriodAccessModel);
  };

  public getCurrencies = async (): Promise<CurrencyAccessModel[]> => {
    const { data, error } = await this.eventContext
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
