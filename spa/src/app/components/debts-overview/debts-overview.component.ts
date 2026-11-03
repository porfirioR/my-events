import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, startWith } from 'rxjs';
import { useCurrencyStore, useDashboardStore } from '../../store';
import { FormatterHelperService } from '../../services';
import { DebtsLoanApiModel } from '../../models/api/dashboard/debts-overview-api.model';
import { LanguageLocales } from '../../constants';

// En el dashboard se muestran los primeros de cada lista
const SUMMARY_ITEMS = 3;

@Component({
  selector: 'app-debts-overview',
  templateUrl: './debts-overview.component.html',
  styleUrls: ['./debts-overview.component.css'],
  imports: [CommonModule, RouterModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class DebtsOverviewComponent {
  // summary: tarjeta del dashboard; full: pantalla /debts con todo
  public mode = input<'summary' | 'full'>('full');

  private router = inject(Router);
  private translate = inject(TranslateService);
  private formatterService = inject(FormatterHelperService);
  private dashboardStore = useDashboardStore();
  private currencyStore = useCurrencyStore();

  protected debts = this.dashboardStore.debts;
  protected isLoading = computed(() => this.dashboardStore.isDebtsLoading() && !this.debts());
  protected hasError = computed(() => !!this.dashboardStore.debtsError() && !this.debts());
  protected isSummary = computed(() => this.mode() === 'summary');

  private language = toSignal(
    this.translate.onLangChange.pipe(map(event => event.lang), startWith(this.translate.getCurrentLang())),
    { initialValue: this.translate.getCurrentLang() },
  );

  protected borrowed = computed(() => this.limit(this.debts()?.borrowed ?? []));
  protected lent = computed(() => this.limit(this.debts()?.lent ?? []));
  protected hiddenCount = computed(() => {
    const debts = this.debts();
    if (!debts || !this.isSummary()) return 0;
    return debts.borrowed.length + debts.lent.length - this.borrowed().length - this.lent().length;
  });
  protected totals = computed(() => this.debts()?.totals ?? []);
  protected isEmpty = computed(() => !!this.debts() && this.debts()!.borrowed.length === 0 && this.debts()!.lent.length === 0);

  // Cobros atrasados de préstamos otorgados, por moneda
  protected overdueCollections = computed(() => {
    const lent = this.debts()?.lent ?? [];
    const count = lent.reduce((sum, l) => sum + l.overdueCount, 0);
    const amounts = new Map<number, number>();
    lent.filter(l => l.overdueAmount > 0).forEach(l => amounts.set(l.currencyId, (amounts.get(l.currencyId) ?? 0) + l.overdueAmount));
    return { count, amounts: [...amounts.entries()].map(([currencyId, amount]) => ({ currencyId, amount })) };
  });

  constructor() {
    this.dashboardStore.loadDebts();
    this.currencyStore.loadCurrencies();
  }

  protected reload = (): void => { this.dashboardStore.loadDebts(); };
  protected openLoan = (loan: DebtsLoanApiModel): void => { this.router.navigate(['/loans', loan.loanId]); };

  // "15 nov 2026"
  protected formatDate = (date: string): string => {
    const [year, month, day] = date.split('-').map(Number);
    const locale = LanguageLocales[this.language() ?? 'en'] ?? 'en-US';
    return new Date(year, month - 1, day).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  };

  protected formatCurrency = this.formatterService.formatCurrency;

  private limit = (list: DebtsLoanApiModel[]): DebtsLoanApiModel[] => (this.isSummary() ? list.slice(0, SUMMARY_ITEMS) : list);
}
