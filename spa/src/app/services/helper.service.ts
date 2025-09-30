import { Injectable } from '@angular/core';
import { KeyValueViewModel } from '../models/view/key-value-view-model';
import { BaseConfigurationApiModel, CurrencyApiModel, PeriodApiModel, TypeApiModel } from '../models/api';
import { Configurations } from '../models/enums';

@Injectable({
  providedIn: 'root'
})
export class HelperService {

  public static convertToList = (elements: BaseConfigurationApiModel[], configurationType: Configurations): KeyValueViewModel[] => elements.map(x => {
    let data = ''
    switch (configurationType) {
      case Configurations.Currencies:
        const currency = (x as CurrencyApiModel)
        data = `Origin ${currency.symbol} ${currency.country}`
        break;
      case Configurations.Periods:
        const period = (x as PeriodApiModel)
        data = period.quantity.toString()
        break;
      case Configurations.Types:
        data = (x as TypeApiModel).description
        break;
      default:
        break;
    }
    return new KeyValueViewModel(x.id, x.name, data)
  })}
