import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { NgClass } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { FormatterHelperService } from '../../services';
import { MovementViewModel } from '../../models/view';

// Historial de movimientos compartido: pagos/cobros de préstamos, depósitos y retiros de ahorros
@Component({
  selector: 'app-movements-list',
  templateUrl: './movements-list.component.html',
  imports: [NgClass, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovementsListComponent {
  private formatterService = inject(FormatterHelperService);

  public items = input.required<MovementViewModel[]>();
  public currencyId = input<number | null>(null);
  // Muestra +/- delante del monto (solo tiene sentido cuando hay entradas y salidas)
  public showSign = input(false);
  public emptyLabel = input('paymentSchedule.noMovements');

  protected formatCurrency = (amount: number): string => this.formatterService.formatCurrency(amount, this.currencyId());
  protected formatDate = (date: string | Date): string => this.formatterService.getFormattedDateCustom(new Date(date));
}
