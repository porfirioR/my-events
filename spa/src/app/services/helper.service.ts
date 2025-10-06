import { Injectable } from '@angular/core';
import { KeyValueViewModel } from '../models/view/key-value-view-model';
import { BaseConfigurationApiModel, CollaboratorApiModel, CurrencyApiModel, PeriodApiModel, TypeApiModel } from '../models/api';
import { Configurations } from '../models/enums';

@Injectable({
  providedIn: 'root'
})
export class HelperService {

  public static convertToList = (elements: BaseConfigurationApiModel[], configurationType: Configurations): KeyValueViewModel[] => elements.map(x => {
    let moreData = ''
    let value = ''
    switch (configurationType) {
      case Configurations.Currencies:
        const currency = (x as CurrencyApiModel)
        moreData = `Origin ${currency.symbol} ${currency.country}`
        value = currency.name
        break;
      case Configurations.Periods:
        const period = (x as PeriodApiModel)
        moreData = period.quantity.toString()
        value = period.name
        break;
      case Configurations.Types:
        const currentType = x as TypeApiModel
        moreData = currentType.description
        value = currentType.name
        break;
      case Configurations.Collaborator:
        const collaborator = x as CollaboratorApiModel
        moreData = `${collaborator.name} ${collaborator.surname}`
        value = moreData
        break;
      default:
        break;
    }
    return new KeyValueViewModel(x.id, value, moreData)
  })}
