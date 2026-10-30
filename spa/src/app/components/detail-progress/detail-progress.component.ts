import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgClass } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

// Barra de progreso de la cabecera de un detalle (préstamos, ahorros)
@Component({
  selector: 'app-detail-progress',
  templateUrl: './detail-progress.component.html',
  imports: [NgClass, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailProgressComponent {
  public percent = input.required<number>();
  public value = input.required<number>();
  public max = input.required<number>();
  // progress-success | progress-info | progress-primary | progress-warning | progress-error
  public progressClass = input('progress-success');
  // text-success | text-info | ...
  public textClass = input('text-success');
  // Textos ya formateados debajo de la barra
  public leftText = input('');
  public rightText = input('');
}
