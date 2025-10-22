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
        if (collaborator.email) {
          moreData += `- ${collaborator.email}`
        }
        value = moreData
        break;
      default:
        break;
    }
    return new KeyValueViewModel(x.id, value, moreData)
  })

  public static getFormattedDate(date: Date, shortDate = false, longDate = false): string {
    const now = new Date();
    if (longDate) return now.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const diffTime = Math.abs(now.getTime() - new Date(date).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (shortDate) return now.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  }

  public static formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0
    }).format(amount);
  }
}
