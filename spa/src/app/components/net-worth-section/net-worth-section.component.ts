import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, startWith } from 'rxjs';
import { useCurrencyStore, useDashboardStore } from '../../store';
import { FormatterHelperService } from '../../services';
import { NetWorthCurrencyApiModel } from '../../models/api/dashboard/net-worth-summary-api.model';
import { NetWorthLiquidity, NetWorthLiquidityColors, NetWorthLiquidityLabels } from '../../models/enums';
import { LanguageLocales } from '../../constants';

const GUARANI_CURRENCY_ID = 4;

interface NetWorthKpi {
  label: string;
  amount: number;
  icon: string;
  iconClass: string;
  valueClass: string;
}

@Component({
  selector: 'app-net-worth-section',
  templateUrl: './net-worth-section.component.html',
  styleUrls: ['./net-worth-section.component.css'],
  imports: [CommonModule, RouterModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Un custom element es inline por defecto: sin block no le aplica el space-y del dashboard
  host: { class: 'block' },
})
export class NetWorthSectionComponent {
  private dashboardStore = useDashboardStore();
  private currencyStore = useCurrencyStore();
  private formatterService = inject(FormatterHelperService);
  private translate = inject(TranslateService);

  protected netWorth = this.dashboardStore.netWorth;
  // Solo el primer cargado muestra skeleton; al volver al dashboard se ve el último patrimonio mientras se actualiza
  protected isLoading = computed(() => this.dashboardStore.isNetWorthLoading() && !this.netWorth());
  protected hasError = computed(() => !!this.dashboardStore.netWorthError() && !this.netWorth());
  private selectedCurrencyId = signal<number | null>(null);

  private language = toSignal(
    this.translate.onLangChange.pipe(map(event => event.lang), startWith(this.translate.getCurrentLang())),
    { initialValue: this.translate.getCurrentLang() },
  );

  // Guaraní primero, el resto por id
  protected currencies = computed<NetWorthCurrencyApiModel[]>(() =>
    [...(this.netWorth()?.currencies ?? [])].sort((a, b) =>
      (a.currencyId === GUARANI_CURRENCY_ID ? -1 : 0) - (b.currencyId === GUARANI_CURRENCY_ID ? -1 : 0) || a.currencyId - b.currencyId
    )
  );

  protected current = computed<NetWorthCurrencyApiModel | null>(() => {
    const list = this.currencies();
    return list.find(c => c.currencyId === this.selectedCurrencyId()) ?? list[0] ?? null;
  });

  // Las clases van literales para que Tailwind las detecte al compilar
  protected kpis = computed<NetWorthKpi[]>(() => {
    const current = this.current();
    if (!current) return [];
    return [
      {
        label: 'netWorth.total',
        amount: current.total,
        icon: 'fa-scale-balanced',
        iconClass: 'bg-primary/15 text-primary',
        valueClass: current.total < 0 ? 'text-error' : 'text-base-content',
      },
      {
        label: 'netWorth.liquidToday',
        amount: this.getLiquidity(current, NetWorthLiquidity.Immediate),
        icon: 'fa-wallet',
        iconClass: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
        valueClass: 'text-base-content',
      },
      {
        label: 'netWorth.locked',
        amount: this.getLiquidity(current, NetWorthLiquidity.Locked),
        icon: 'fa-lock',
        iconClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
        valueClass: 'text-base-content',
      },
      {
        label: 'netWorth.debts',
        amount: current.liabilities,
        icon: 'fa-hand-holding-dollar',
        iconClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
        valueClass: current.liabilities > 0 ? 'text-error' : 'text-base-content',
      },
    ];
  });

  // Barra apilada: solo los tramos con plata (un sobregiro puede dejar "inmediata" en negativo)
  protected liquiditySegments = computed(() => {
    const current = this.current();
    if (!current) return [];
    const positive = current.byLiquidity.filter(l => l.amount > 0);
    const total = positive.reduce((sum, l) => sum + l.amount, 0);
    return current.byLiquidity.map(l => ({
      liquidity: l.liquidity,
      amount: l.amount,
      label: NetWorthLiquidityLabels[l.liquidity],
      colorClass: NetWorthLiquidityColors[l.liquidity],
      share: total > 0 && l.amount > 0 ? (l.amount / total) * 100 : 0,
    }));
  });

  // Barras por entidad, proporcionales a la entidad con más activos
  protected institutions = computed(() => {
    const current = this.current();
    if (!current) return [];
    const max = Math.max(0, ...current.byInstitution.map(i => i.assets));
    return current.byInstitution.map(i => ({
      ...i,
      share: max > 0 && i.assets > 0 ? (i.assets / max) * 100 : 0,
    }));
  });

  protected lastUpdate = computed(() => {
    const date = this.netWorth()?.lastSnapshotDate;
    if (!date) return null;
    const [year, month] = date.split('-').map(Number);
    const locale = LanguageLocales[this.language() ?? 'en'] ?? 'en-US';
    return new Date(year, month - 1, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  });

  constructor() {
    this.dashboardStore.loadNetWorth();
  }

  protected selectCurrency = (currencyId: number): void => this.selectedCurrencyId.set(currencyId);
  protected reload = (): void => { this.dashboardStore.loadNetWorth(); };

  protected getCurrencyCode = (currencyId: number): string =>
    this.currencyStore.getCurrencyById()(currencyId)?.currencyCode ?? String(currencyId);

  protected formatCurrency = this.formatterService.formatCurrency;

  private getLiquidity = (current: NetWorthCurrencyApiModel, liquidity: NetWorthLiquidity): number =>
    current.byLiquidity.find(l => l.liquidity === liquidity)?.amount ?? 0;
}
