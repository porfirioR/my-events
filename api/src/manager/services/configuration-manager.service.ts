import { Injectable } from '@nestjs/common';
import { ConfigurationAccessService } from '../../access/mail';
import { TypeAccessModel } from '../../access/contract/configurations/type-access-model';
import { PeriodAccessModel } from '../../access/contract/configurations/period-access-model';
import { Configurations } from '../../utility/enums';
import { CurrencyAccessModel } from 'src/access/contract/configurations/currency-access-model';
import { CurrencyModel, PeriodModel, TypeModel } from '../models/configurations';

@Injectable()
export class ConfigurationManagerService {

  constructor(
    private readonly configurationAccessService: ConfigurationAccessService
  ) { }

  public getConfiguration = async (configuration: Configurations): Promise<TypeModel[] | PeriodModel[] | CurrencyModel[]> => {
    switch (configuration) {
      case Configurations.Periods:
        return this.getPeriods()
      case Configurations.Types:
        return this.getTypes()
      case Configurations.Currencies:
        return this.getCurrencies()
      default:
        break;
    }
  }

  private getTypes = async (): Promise<TypeModel[]> => {
    const accessModelList = await this.configurationAccessService.getTypes();
    return accessModelList.map(this.mapAccessModelToModel)
  }

  private getPeriods = async (): Promise<PeriodModel[]> => {
    const accessModelList = await this.configurationAccessService.getPeriods();
    return accessModelList.map(this.mapPeriodAccessModelToModel)
  }

  private getCurrencies = async (): Promise<CurrencyModel[]> => {
    const accessModelList = await this.configurationAccessService.getCurrencies();
    return accessModelList.map(this.mapCurrencyAccessModelToModel)
  }

  private mapAccessModelToModel = (accessModel: TypeAccessModel): TypeModel => new TypeModel(
    accessModel.id,
    accessModel.name,
    accessModel.description,
  )

  private mapPeriodAccessModelToModel = (accessModel: PeriodAccessModel): PeriodModel => new PeriodModel(
    accessModel.id,
    accessModel.name,
    accessModel.quantity,
  )

  private mapCurrencyAccessModelToModel = (accessModel: CurrencyAccessModel): CurrencyModel => new CurrencyModel(
    accessModel.id,
    accessModel.name,
    accessModel.symbol,
    accessModel.country,
  )

}
