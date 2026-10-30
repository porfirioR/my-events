import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { NgClass } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { FormatterHelperService } from '../../services';
import { InstallmentColumnViewModel, InstallmentRowViewModel } from '../../models/view';
import { InstallmentStatus, InstallmentStatusBadgeColors, InstallmentStatusIcons, InstallmentStatusLabels } from '../../models/enums';

// Cronograma de cuotas compartido: tabla en escritorio, tarjetas en móvil
@Component({
  selector: 'app-installments-table',
  templateUrl: './installments-table.component.html',
  imports: [NgClass, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstallmentsTableComponent {
  private formatterService = inject(FormatterHelperService);

  public rows = input.required<InstallmentRowViewModel[]>();
  public columns = input<InstallmentColumnViewModel[]>([]);
  public currencyId = input<number | null>(null);
  public canAct = input(true);
  public amountLabel = input('paymentSchedule.amount');
  public payLabel = input('paymentSchedule.pay');
  public skipLabel = input('paymentSchedule.skip');
  public emptyLabel = input('paymentSchedule.noInstallments');

  public pay = output<InstallmentRowViewModel>();
  public skip = output<InstallmentRowViewModel>();

  protected InstallmentStatus = InstallmentStatus;

  protected formatCurrency = (amount: number): string => this.formatterService.formatCurrency(amount, this.currencyId());
  protected formatDate = (date: string | Date): string => this.formatterService.getFormattedDateCustom(new Date(date));

  protected rowClass = (row: InstallmentRowViewModel, defaultClass = ''): string => {
    if (row.statusId === InstallmentStatus.Paid) return 'bg-success/10';
    if (row.statusId === InstallmentStatus.Skipped) return `opacity-60 ${defaultClass}`;
    return defaultClass;
  };

  protected isActionable =(row: InstallmentRowViewModel): boolean =>
    this.canAct() && row.statusId === InstallmentStatus.Pending;

  protected badgeColor = (statusId: number): string =>
    InstallmentStatusBadgeColors[statusId as InstallmentStatus] ?? 'badge-ghost';
  protected statusIcon = (statusId: number): string =>
    InstallmentStatusIcons[statusId as InstallmentStatus] ?? '';
  protected statusLabel = (statusId: number): string =>
    InstallmentStatusLabels[statusId as InstallmentStatus] ?? '';
}
