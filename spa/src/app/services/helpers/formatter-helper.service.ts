import { inject, Injectable } from '@angular/core';
import { KeyValueViewModel } from '../../models/view/key-value-view-model';
import { BaseConfigurationApiModel, CollaboratorApiModel, CurrencyApiModel, PeriodApiModel, TypeApiModel } from '../../models/api';
import { Configurations, GoalStatus, GoalStatusColors, GoalStatusIcons, GoalStatusLabels, ProgressionType, ProgressionTypeIcons, ProgressionTypeLabels } from '../../models/enums';
import { useCurrencyStore } from '../../store';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class FormatterHelperService {
  private currencyStore = useCurrencyStore();
  private translate = inject(TranslateService);

  public static convertToList = (elements: BaseConfigurationApiModel[], configurationType: Configurations): KeyValueViewModel[] => elements.map(x => {
    let moreData = ''
    let value = ''
    switch (configurationType) {
      case Configurations.Currencies:
        const currency = (x as CurrencyApiModel)
        moreData = `Symbol: ${currency.symbol} - Country: ${currency.country}`
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
          moreData += ` - ${collaborator.email}`
        }
        value = moreData
        break;
      default:
        break;
    }
    return new KeyValueViewModel(x.id, value, moreData)
  })

  public getFormattedDate(date: Date, shortDate = false, longDate = false): string {
    const now = new Date();
    if (longDate) {
      return now.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    const diffTime = Math.abs(now.getTime() - new Date(date).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return this.translate.instant('common.today');
    if (diffDays === 1) return this.translate.instant('common.yesterday');
    if (diffDays < 7) return `${diffDays}${this.translate.instant('common.daysAgo')}`;

    if (shortDate) {
      return now.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }

    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} ${this.translate.instant('common.weeksAgo')}`;
    }

    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} ${this.translate.instant('common.monthsAgo')}`;
    }

    const years = Math.floor(diffDays / 365);
    return `${years} ${this.translate.instant('common.yearsAgo')}`;
  }

  public formatCurrency = (amount: number, currencyId?: number | null): string => {
    return this.currencyStore.formatCurrency()(amount, currencyId ?? 1);
  }

  public getCurrency = (currencyId: number): CurrencyApiModel | undefined => {
    return this.currencyStore.getCurrencyById()(currencyId);
  }

  public getCurrencySymbol = (currencyId: number): string => {
    const currency = this.getCurrency(currencyId);
    return currency?.symbol || '$';
  }

  public static getInitials = (fullName: string): string => {
    const parts = fullName.split(' ');
    if (parts.length >= 2) {
      return parts[0][0] + parts[1][0];
    }
    return fullName.substring(0, 2).toUpperCase();
  }

  
  public static  getGoalStatusLabel(statusId: number): string {
    return GoalStatusLabels[statusId as GoalStatus] || 'Unknown';
  }
  
  public static getGoalStatusIcon(statusId: number): string {
    return GoalStatusIcons[statusId as GoalStatus] || 'fa-question';
  }

  public static getGoalStatusColor(statusId: number): string {
    return GoalStatusColors[statusId as GoalStatus] || 'text-base-content';
  }

  public static getProgressionTypeLabel(typeId: number): string {
    return ProgressionTypeLabels[typeId as ProgressionType] || 'Unknown';
  }

  public static getProgressionTypeIcon(typeId: number): string {
    return ProgressionTypeIcons[typeId as ProgressionType] || 'fa-question';
  }
}
