import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, startWith } from 'rxjs';
import { useCurrencyStore, useDashboardStore } from '../../store';
import { FormatterHelperService } from '../../services';
import { LanguageLocales } from '../../constants';
import { HealthIndicatorApiModel, HealthStatus } from '../../models/api/dashboard/financial-health-api.model';

interface HealthIndicatorView {
  key: 'cushion' | 'savings' | 'debt';
  icon: string;
  indicator: HealthIndicatorApiModel;
  // Valor formateado ("4,2 meses", "15 %") o null si falta el parámetro
  display: string | null;
  // Cálculo en palabras: "Gs. 16.862.303 ÷ Gs. 4.000.000"
  formula: string;
  // Umbral para verde y amarillo, como ayuda
  thresholds: string;
  // Qué parámetro falta cargar
  missingKey: string;
}

const STATUS_CLASSES: Record<HealthStatus, { badge: string; text: string; ring: string }> = {
  good: { badge: 'badge-success', text: 'text-success', ring: 'border-success/40' },
  warning: { badge: 'badge-warning', text: 'text-warning', ring: 'border-warning/40' },
  bad: { badge: 'badge-error', text: 'text-error', ring: 'border-error/40' },
};

// Tarjeta del dashboard con los indicadores de salud financiera del mes (#228)
@Component({
  selector: 'app-financial-health',
  templateUrl: './financial-health.component.html',
  imports: [CommonModule, RouterModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class FinancialHealthComponent {
  private translate = inject(TranslateService);
  private formatterService = inject(FormatterHelperService);
  private dashboardStore = useDashboardStore();
  private currencyStore = useCurrencyStore();

  protected health = this.dashboardStore.health;
  protected isLoading = computed(() => this.dashboardStore.isHealthLoading() && !this.health());
  protected hasError = computed(() => !!this.dashboardStore.healthError() && !this.health());
  // Sin ingreso ni gasto cargados no hay ningún indicador: se invita a configurarlos
  protected isUnconfigured = computed(() => {
    const h = this.health();
    return !!h && h.monthlyNetIncome === null && h.monthlyEssentialExpense === null;
  });

  private language = toSignal(
    this.translate.onLangChange.pipe(map(event => event.lang), startWith(this.translate.getCurrentLang())),
    { initialValue: this.translate.getCurrentLang() },
  );

  protected indicators = computed<HealthIndicatorView[]>(() => {
    const h = this.health();
    if (!h) return [];
    this.language(); // recalcular textos al cambiar de idioma
    const money = (amount: number) => this.formatterService.formatCurrency(amount, h.currencyId);
    const t = h.thresholds;
    return [
      {
        key: 'cushion',
        icon: 'fa-umbrella',
        indicator: h.cushionMonths,
        display: h.cushionMonths.value === null ? null : this.translate.instant('financialHealth.months', { value: this.formatNumber(h.cushionMonths.value) }),
        formula: h.monthlyEssentialExpense === null ? '' : `${money(h.liquidImmediate)} ÷ ${money(h.monthlyEssentialExpense)}`,
        thresholds: this.translate.instant('financialHealth.cushionThresholds', { green: this.formatNumber(t.cushionGreenMonths), yellow: this.formatNumber(t.cushionYellowMonths) }),
        missingKey: 'financialHealth.missingExpense',
      },
      {
        key: 'savings',
        icon: 'fa-piggy-bank',
        indicator: h.savingsRate,
        display: this.formatPercentage(h.savingsRate.value),
        formula: h.monthlyNetIncome === null ? '' : `${money(h.monthlySavingsContributions)} ÷ ${money(h.monthlyNetIncome)}`,
        thresholds: this.translate.instant('financialHealth.savingsThresholds', { green: this.formatNumber(t.savingsGreenPercentage), yellow: this.formatNumber(t.savingsYellowPercentage) }),
        missingKey: 'financialHealth.missingIncome',
      },
      {
        key: 'debt',
        icon: 'fa-file-invoice-dollar',
        indicator: h.debtRate,
        display: this.formatPercentage(h.debtRate.value),
        formula: h.monthlyNetIncome === null ? '' : `${money(h.monthlyLoanInstallments)} ÷ ${money(h.monthlyNetIncome)}`,
        thresholds: this.translate.instant('financialHealth.debtThresholds', { green: this.formatNumber(t.debtGreenPercentage), yellow: this.formatNumber(t.debtYellowPercentage) }),
        missingKey: 'financialHealth.missingIncome',
      },
    ];
  });

  constructor() {
    this.dashboardStore.loadHealth();
    this.currencyStore.loadCurrencies();
  }

  protected reload = (): void => { this.dashboardStore.loadHealth(); };

  protected statusClasses = (status: HealthStatus | null) => (status ? STATUS_CLASSES[status] : null);

  private formatNumber = (value: number): string => {
    const locale = LanguageLocales[this.language() ?? 'en'] ?? 'en-US';
    return value.toLocaleString(locale, { maximumFractionDigits: 1 });
  };

  private formatPercentage = (value: number | null): string | null =>
    value === null ? null : `${this.formatNumber(value)} %`;
}
