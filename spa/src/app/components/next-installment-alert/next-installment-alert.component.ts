import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { FormatterHelperService } from '../../services';

// Aviso de próxima cuota compartido por préstamos y ahorros
@Component({
  selector: 'app-next-installment-alert',
  templateUrl: './next-installment-alert.component.html',
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NextInstallmentAlertComponent {
  private formatterService = inject(FormatterHelperService);

  public installmentNumber = input.required<number>();
  public amount = input.required<number>();
  public dueDate = input<string | Date | null>(null);
  public currencyId = input<number | null>(null);
  public actionLabel = input('paymentSchedule.pay');
  public canAct = input(true);

  public act = output<void>();

  protected formatCurrency = (amount: number): string => this.formatterService.formatCurrency(amount, this.currencyId());
  protected formatDate = (date: string | Date): string => this.formatterService.getFormattedDateCustom(new Date(date));
}
