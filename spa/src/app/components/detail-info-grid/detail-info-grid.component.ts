import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgClass } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { DetailFieldViewModel } from '../../models/view';

// Bloque de información (fechas, tasas, totales) de la cabecera de un detalle
@Component({
  selector: 'app-detail-info-grid',
  templateUrl: './detail-info-grid.component.html',
  imports: [NgClass, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailInfoGridComponent {
  public fields = input.required<DetailFieldViewModel[]>();
}
