import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { map, startWith } from 'rxjs';
import { CheckBoxInputComponent } from '../inputs/check-box-input/check-box-input.component';
import { FormatterHelperService } from '../../services';
import { useCurrencyStore, useImportsStore } from '../../store';
import { LanguageLocales } from '../../constants';
import {
  MyMoneyReconciliationInstallmentApiModel,
  MyMoneyReconciliationRowApiModel,
  MyMoneyReconciliationStatus,
} from '../../models/api/imports/mymoney-reconciliation-api.model';

// El export de MyMoney es siempre en guaraníes
const GUARANI_CURRENCY_ID = 4;
const RECONCILABLE: MyMoneyReconciliationStatus[] = ['matched', 'paidOnlyInMyMoney'];

const STATUS_BADGES: Record<MyMoneyReconciliationStatus, string> = {
  reconciled: 'badge-success',
  matched: 'badge-info',
  paidOnlyInMyMoney: 'badge-warning',
  unmatched: 'badge-error',
  noInstallments: 'badge-ghost',
};

// Concilia las transferencias importadas de MyMoney con las cuotas de ahorros y préstamos (#233):
// propone la cuota de cada movimiento, muestra las diferencias en los dos sentidos y, al conciliar,
// opcionalmente marca como pagadas las cuotas que solo estaban pagadas en MyMoney.
@Component({
  selector: 'app-mymoney-reconciliation',
  templateUrl: './mymoney-reconciliation.component.html',
  imports: [CommonModule, RouterModule, ReactiveFormsModule, TranslateModule, CheckBoxInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyMoneyReconciliationComponent {
  private translate = inject(TranslateService);
  private formatterService = inject(FormatterHelperService);
  private importsStore = useImportsStore();
  private currencyStore = useCurrencyStore();

  protected month = signal(this.toMonth(new Date()));
  protected reconciliation = this.importsStore.reconciliation;
  protected isLoading = this.importsStore.isReconciliationLoading;
  protected isApplying = this.importsStore.isReconciliationApplying;
  protected hasError = computed(() => !!this.importsStore.reconciliationError());
  protected applyResult = this.importsStore.reconciliationApplyResult;
  protected statusBadges = STATUS_BADGES;

  protected formGroup = new FormGroup({
    // Al conciliar, pagar en my-events las cuotas que solo están pagadas en MyMoney
    markAsPaid: new FormControl(true, { nonNullable: true }),
  });

  private language = toSignal(
    this.translate.onLangChange.pipe(map(event => event.lang), startWith(this.translate.getCurrentLang())),
    { initialValue: this.translate.getCurrentLang() },
  );
  private locale = computed(() => LanguageLocales[this.language() ?? 'en'] ?? 'en-US');

  protected monthLabel = computed(() => {
    const [year, month] = this.month().split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString(this.locale(), { month: 'long', year: 'numeric' });
  });

  protected rows = computed(() => this.reconciliation()?.rows ?? []);
  protected reconcilableRows = computed(() => this.rows().filter(row => RECONCILABLE.includes(row.status)));
  protected counts = computed(() => {
    const counts: Record<MyMoneyReconciliationStatus, number> = { reconciled: 0, matched: 0, paidOnlyInMyMoney: 0, unmatched: 0, noInstallments: 0 };
    this.rows().forEach(row => counts[row.status]++);
    return counts;
  });
  protected summary = computed(() => [
    { status: 'reconciled' as const, count: this.counts().reconciled },
    { status: 'matched' as const, count: this.counts().matched },
    { status: 'paidOnlyInMyMoney' as const, count: this.counts().paidOnlyInMyMoney },
    { status: 'unmatched' as const, count: this.counts().unmatched },
    { status: 'noInstallments' as const, count: this.counts().noInstallments },
  ]);
  protected paidOnlyInMyEvents = computed(() => this.reconciliation()?.paidOnlyInMyEvents ?? []);
  protected pendingInBoth = computed(() => this.reconciliation()?.pendingInBoth ?? []);

  constructor() {
    this.currencyStore.loadCurrencies();
    this.load();
  }

  protected changeMonth = (delta: number): void => {
    const [year, month] = this.month().split('-').map(Number);
    this.month.set(this.toMonth(new Date(year, month - 1 + delta, 1)));
    this.load();
  };

  protected reconcileAll = (): void => this.reconcile(this.reconcilableRows());

  protected reconcileRow = (row: MyMoneyReconciliationRowApiModel): void => this.reconcile([row]);

  protected unreconcile = (row: MyMoneyReconciliationRowApiModel): void => {
    if (this.isApplying()) return;
    this.importsStore.unreconcile({ month: this.month(), importedMovementId: row.importedMovementId });
  };

  protected isReconcilable = (row: MyMoneyReconciliationRowApiModel): boolean => RECONCILABLE.includes(row.status);

  // "Cuota 4" o "Cuotas 8–11"
  protected installmentsLabel = (installments: MyMoneyReconciliationInstallmentApiModel[]): string => {
    if (!installments.length) return '';
    if (installments.length === 1) return this.translate.instant('myMoneyReconciliation.installment', { number: installments[0].number });
    const numbers = installments.map(i => i.number);
    return this.translate.instant('myMoneyReconciliation.installments', { from: Math.min(...numbers), to: Math.max(...numbers) });
  };

  protected installmentsTotal = (installments: MyMoneyReconciliationInstallmentApiModel[]): number =>
    installments.reduce((sum, i) => sum + i.amount, 0);

  protected installmentDate = (installment: MyMoneyReconciliationInstallmentApiModel): string =>
    installment.dueDate ? this.formatDate(installment.dueDate) : '';

  protected money = (amount: number): string => this.formatterService.formatCurrency(amount, GUARANI_CURRENCY_ID);

  protected formatDate = (value: string): string => {
    // 'YYYY-MM-DD' es fecha local: armar la fecha sin pasar por UTC
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(this.locale(), { day: 'numeric', month: 'short' });
  };

  private reconcile = (rows: MyMoneyReconciliationRowApiModel[]): void => {
    if (!rows.length || this.isApplying()) return;
    const markAsPaid = this.formGroup.controls.markAsPaid.value;
    this.importsStore.applyReconciliation({
      month: this.month(),
      items: rows.map(row => ({
        importedMovementId: row.importedMovementId,
        installmentIds: row.installments.map(i => i.id),
        markAsPaid,
      })),
    });
  };

  private load = (): void => this.importsStore.loadReconciliation(this.month());

  private toMonth(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
}
