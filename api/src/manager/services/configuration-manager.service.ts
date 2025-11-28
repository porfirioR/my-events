import { Inject, Injectable } from '@nestjs/common';
import { CurrencyAccessModel } from '../../access/contract/configurations/currency-access-model';
import { Configurations } from '../../utility/enums';
import { ConfigurationBaseModel, CurrencyModel, SavingsProgressionTypeModel } from '../models/configurations';
import { ConfigurationBaseAccessModel, IConfigurationAccessService, InstallmentStatusAccessModel, SavingsProgressionTypeAccessModel } from '../../access/contract/configurations';
import { SAVINGS_TOKENS } from '../../utility/constants/injection-tokens.const';

@Injectable()
export class ConfigurationManagerService {

  constructor(
    @Inject(SAVINGS_TOKENS.CONFIGURATION_ACCESS_SERVICE)
    private readonly configurationAccessService: IConfigurationAccessService,
  ) { }

  public getConfiguration = async (configuration: Configurations): Promise<ConfigurationBaseModel[] | CurrencyModel[]> => {
    if (configuration === Configurations.Currencies) {
      return await this.getCurrencies()
    } else {
      let accessModelList: Promise<ConfigurationBaseAccessModel[]>
      switch (configuration) {
        case Configurations.InstallmentStatuses:
          accessModelList = this.getInstallmentStatuses()
        case Configurations.SavingsStatuses:
          accessModelList = this.getSavingsStatuses()
        case Configurations.SavingsProgressionTypes:
          accessModelList = this.getSavingsProgressionType()
        default:
          break;
      }
      return (await accessModelList).map(this.mapAccessModelToModel)
    }
  }

  // ===== Private methods =====
  private getInstallmentStatuses = async (): Promise<InstallmentStatusAccessModel[]> => {
    return await this.configurationAccessService.getInstallmentStatuses();
  }

  private getSavingsStatuses = async (): Promise<InstallmentStatusAccessModel[]> => {
    return await this.configurationAccessService.getSavingsStatuses();
  }

  private getSavingsProgressionType = async (): Promise<SavingsProgressionTypeAccessModel[]> => {
    return await this.configurationAccessService.getSavingsProgressionTypes();
  }

  private getCurrencies = async (): Promise<CurrencyModel[]> => {
    const accessModelList = await this.configurationAccessService.getCurrencies();
    return accessModelList.map(this.mapCurrencyAccessModelToModel)
  }

  private mapAccessModelToModel = (accessModel: ConfigurationBaseModel): ConfigurationBaseModel => new SavingsProgressionTypeModel(
    accessModel.id,
    accessModel.name,
    accessModel.description,
  );

  private mapCurrencyAccessModelToModel = (accessModel: CurrencyAccessModel): CurrencyModel => new CurrencyModel(
    accessModel.id,
    accessModel.name,
    accessModel.symbol,
    accessModel.country,
    accessModel.locale,
    accessModel.currencyCode,
    accessModel.minimumDecimal
  );

}
