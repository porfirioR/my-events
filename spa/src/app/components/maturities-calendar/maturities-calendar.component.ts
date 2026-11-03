import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, startWith } from 'rxjs';
import { useCurrencyStore, useDashboardStore } from '../../store';
import { FormatterHelperService } from '../../services';
import { MaturityEventApiModel, MaturityMonthApiModel } from '../../models/api/dashboard/maturity-calendar-api.model';
import { MaturityEventType, MaturityEventTypeColors, MaturityEventTypeIcons, MaturityEventTypeLabels } from '../../models/enums';
import { LanguageLocales } from '../../constants';

// En el dashboard se muestran solo los próximos meses que tienen algo
const SUMMARY_MONTHS = 3;

@Component({
  selector: 'app-maturities-calendar',
  templateUrl: './maturities-calendar.component.html',
  styleUrls: ['./maturities-calendar.component.css'],
  imports: [CommonModule, RouterModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class MaturitiesCalendarComponent {
  // summary: tarjeta del dashboard; full: pantalla /maturities con los 12 meses
  public mode = input<'summary' | 'full'>('full');

  private router = inject(Router);
  private translate = inject(TranslateService);
  private formatterService = inject(FormatterHelperService);
  private dashboardStore = useDashboardStore();
  private currencyStore = useCurrencyStore();

  protected calendar = this.dashboardStore.maturities;
  protected isLoading = computed(() => this.dashboardStore.isMaturitiesLoading() && !this.calendar());
  protected hasError = computed(() => !!this.dashboardStore.maturitiesError() && !this.calendar());
  protected isSummary = computed(() => this.mode() === 'summary');

  protected MaturityEventType = MaturityEventType;
  // El ng-template de la fila no tipa el contexto: se resuelve acá
  protected typeLabel = (type: MaturityEventType): string => MaturityEventTypeLabels[type];
  protected typeIcon = (type: MaturityEventType): string => MaturityEventTypeIcons[type];
  protected typeColor = (type: MaturityEventType): string => MaturityEventTypeColors[type];

  private language = toSignal(
    this.translate.onLangChange.pipe(map(event => event.lang), startWith(this.translate.getCurrentLang())),
    { initialValue: this.translate.getCurrentLang() },
  );
  private locale = computed(() => LanguageLocales[this.language() ?? 'en'] ?? 'en-US');

  protected overdue = computed(() => this.calendar()?.overdue ?? []);

  // Resumen: los próximos meses con eventos; completo: los 12 meses (los vacíos se muestran compactos)
  protected months = computed<MaturityMonthApiModel[]>(() => {
    const months = this.calendar()?.months ?? [];
    return this.isSummary() ? months.filter(m => m.events.length > 0).slice(0, SUMMARY_MONTHS) : months;
  });

  protected hasAnyEvent = computed(() => (this.calendar()?.months ?? []).some(m => m.events.length > 0));

  constructor() {
    this.dashboardStore.loadMaturities();
    this.currencyStore.loadCurrencies();
  }

  protected reload = (): void => { this.dashboardStore.loadMaturities(); };

  // "noviembre de 2026"
  protected formatMonth = (month: string): string => {
    const [year, monthNumber] = month.split('-').map(Number);
    const label = new Date(year, monthNumber - 1, 1).toLocaleDateString(this.locale(), { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  // "15 nov"; con año si no es el actual (ej. un vencido del año pasado: "10 nov 2025")
  protected formatDay = (date: string): string => {
    const [year, month, day] = date.split('-').map(Number);
    const withYear = year !== new Date().getFullYear();
    return new Date(year, month - 1, day).toLocaleDateString(this.locale(), { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) });
  };

  // Ahorro → su detalle; préstamo → el detalle del préstamo
  protected openSource = (event: MaturityEventApiModel): void => {
    const isSavings = event.type === MaturityEventType.SavingsMaturity || event.type === MaturityEventType.RotatingPayout;
    this.router.navigate([isSavings ? '/savings' : '/loans', event.sourceId]);
  };

  protected formatCurrency = this.formatterService.formatCurrency;
}
