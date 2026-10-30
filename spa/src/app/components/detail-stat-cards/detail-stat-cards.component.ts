import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgClass } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { DetailFieldViewModel } from '../../models/view';

// Tarjetas de resumen de la cabecera de un detalle (préstamos, ahorros)
@Component({
  selector: 'app-detail-stat-cards',
  templateUrl: './detail-stat-cards.component.html',
  imports: [NgClass, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailStatCardsComponent {
  public cards = input.required<DetailFieldViewModel[]>();

  // Clases literales para que Tailwind las detecte
  protected gridClass = computed(() => this.cards().length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-4');
}
