import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, DestroyRef, OnInit,
  inject, effect, computed, signal, untracked,
} from '@angular/core';
import { FormControl, FormGroup, FormRecord, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { map, startWith } from 'rxjs';
import { preventUnsavedUnload } from '../../guards/prevent-unsaved-unload';
import { TextComponent } from '../inputs/text/text.component';
import { SelectInputComponent } from '../inputs/select-input/select-input.component';
import { AlertService, FormatterHelperService } from '../../services';
import { useAccountsStore, useCurrencyStore, useFinancialInstitutionsStore } from '../../store';
import { AccountApiModel, AccountBalanceItemApiRequest, UpsertAccountBalancesApiRequest } from '../../models/api/accounts';
import { AccountType, AccountTypeIcons, AccountTypeLabels } from '../../models/enums';
import { KeyValueViewModel } from '../../models/view/key-value-view-model';
import { LanguageLocales } from '../../constants';

interface AccountBalancesFormGroup {
  month: FormControl<string | null>;
  // Un control por cuenta activa, con el id de la cuenta como clave
  balances: FormRecord<FormControl<number | string | null>>;
}

interface BalanceRow {
  account: AccountApiModel;
  institutionName: string;
  // Último saldo de un mes anterior al elegido
  previousBalance: number | null;
}

// Meses que se ofrecen en el selector (hacia atrás desde el actual)
const MONTHS_BACK = 24;

@Component({
  selector: 'app-account-balances',
  templateUrl: './account-balances.component.html',
  styleUrls: ['./account-balances.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, TranslateModule, TextComponent, SelectInputComponent],
})
export class AccountBalancesComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  private alertService = inject(AlertService);
  private formatterService = inject(FormatterHelperService);
  private translate = inject(TranslateService);
  private accountsStore = useAccountsStore();
  private currencyStore = useCurrencyStore();
  private financialInstitutionsStore = useFinancialInstitutionsStore();

  protected isLoading = this.accountsStore.needsLoadingAccounts;
  protected saving = signal(false);
  public ignorePreventUnsavedChanges = false;
  private lastMonthStart: string | null = null;
  private lastBalances: unknown = null;

  public formGroup = new FormGroup<AccountBalancesFormGroup>({
    month: new FormControl(this.toMonthKey(new Date())),
    balances: new FormRecord<FormControl<number | string | null>>({}),
  });

  private language = toSignal(
    this.translate.onLangChange.pipe(map(event => event.lang), startWith(this.translate.getCurrentLang())),
    { initialValue: this.translate.getCurrentLang() },
  );

  private month = toSignal(
    this.formGroup.controls.month.valueChanges.pipe(startWith(this.formGroup.controls.month.value)),
    { initialValue: this.formGroup.controls.month.value },
  );

  private balanceValues = toSignal(this.formGroup.controls.balances.valueChanges, { initialValue: {} as Record<string, number | string | null> });

  // "noviembre de 2026", del mes actual hacia atrás
  protected monthList = computed(() => {
    const locale = LanguageLocales[this.language() ?? 'en'] ?? 'en-US';
    const now = new Date();
    return Array.from({ length: MONTHS_BACK }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
      return new KeyValueViewModel(this.toMonthKey(date), label.charAt(0).toUpperCase() + label.slice(1), '');
    });
  });

  protected rows = computed<BalanceRow[]>(() => {
    const monthStart = `${this.month()}-01`;
    const institutions = this.financialInstitutionsStore.financialInstitutionsById();
    const balances = this.accountsStore.balances();
    return this.accountsStore.activeAccounts().map(account => {
      const previous = balances
        .filter(b => b.accountId === account.id && b.snapshotDate < monthStart)
        .sort((a, b) => b.snapshotDate.localeCompare(a.snapshotDate))[0];
      return {
        account,
        institutionName: institutions.get(account.institutionId)?.name ?? '',
        previousBalance: previous?.balance ?? null,
      };
    });
  });

  // El mes elegido ya tiene saldos guardados: al guardar se actualizan
  protected isMonthLoaded = computed(() => {
    const monthStart = `${this.month()}-01`;
    return this.accountsStore.balances().some(b => b.snapshotDate === monthStart);
  });

  // Total de los saldos nuevos por moneda (no se suman monedas distintas)
  protected totalsByCurrency = computed(() => {
    const values = this.balanceValues();
    const totals = new Map<number, number>();
    this.rows().forEach(row => {
      const value = this.toNumberOrNull(values[String(row.account.id)]);
      if (value === null) return;
      totals.set(row.account.currencyId, (totals.get(row.account.currencyId) ?? 0) + value);
    });
    return [...totals.entries()].map(([currencyId, total]) => ({ currencyId, total }));
  });

  constructor() {
    preventUnsavedUnload(this);

    // Arma un control por cuenta: el saldo ya cargado del mes, o si no el anterior (lo más rápido es cambiar solo lo que cambió).
    // Los controles existentes se reutilizan: el input ya renderizado queda atado al control con el que se creó,
    // así que reemplazarlo lo desconectaría del formulario
    effect(() => {
      const rows = this.rows();
      const monthStart = `${this.month()}-01`;
      const balances = this.accountsStore.balances();
      untracked(() => {
        const group = this.formGroup.controls.balances;
        // Solo se pisan los valores al cambiar de mes o al llegar los saldos, no cuando llegan otros datos (ej. entidades)
        const resetValues = monthStart !== this.lastMonthStart || balances !== this.lastBalances;
        this.lastMonthStart = monthStart;
        this.lastBalances = balances;

        const ids = new Set(rows.map(row => String(row.account.id)));
        Object.keys(group.controls).filter(key => !ids.has(key)).forEach(key => group.removeControl(key, { emitEvent: false }));
        rows.forEach(row => {
          const key = String(row.account.id);
          const current = balances.find(b => b.accountId === row.account.id && b.snapshotDate === monthStart);
          const value = current?.balance ?? row.previousBalance;
          const control = group.controls[key];
          if (!control) {
            group.addControl(key, new FormControl(value), { emitEvent: false });
          } else if (resetValues) {
            control.setValue(value, { emitEvent: false });
          }
        });
        group.updateValueAndValidity();
        if (resetValues) this.formGroup.markAsPristine();
      });
    });
  }

  ngOnInit(): void {
    this.accountsStore.reloadAccounts();
    this.accountsStore.loadBalances({});
    this.currencyStore.loadCurrencies();
    this.financialInstitutionsStore.loadFinancialInstitutions();
  }

  protected getDifference = (row: BalanceRow): number | null => {
    const value = this.toNumberOrNull(this.balanceValues()[String(row.account.id)]);
    if (value === null || row.previousBalance === null) return null;
    return value - row.previousBalance;
  };

  protected save = (event?: Event): void => {
    event?.preventDefault();
    const values = this.formGroup.controls.balances.getRawValue();
    const items = this.rows()
      .map(row => ({ accountId: row.account.id, balance: this.toNumberOrNull(values[String(row.account.id)]) }))
      .filter((item): item is { accountId: number; balance: number } => item.balance !== null)
      .map(item => new AccountBalanceItemApiRequest(item.accountId, Math.round(item.balance)));

    if (items.length === 0) {
      this.alertService.showError(this.translate.instant('accountBalances.nothingToSave'));
      return;
    }

    this.saving.set(true);
    this.formGroup.disable({ emitEvent: false });
    this.accountsStore.upsertBalances(new UpsertAccountBalancesApiRequest(this.formGroup.controls.month.value!, items))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.ignorePreventUnsavedChanges = true;
          this.alertService.showSuccess(this.translate.instant('accountBalances.savedSuccess'));
          this.exit();
        },
        error: (e) => {
          this.formGroup.enable({ emitEvent: false });
          this.saving.set(false);
          this.alertService.showError(this.translate.instant('accountBalances.savedError'));
          throw e;
        },
      });
  };

  protected cancel = (): void => { this.exit(); };
  protected exit = (): void => { this.router.navigate(['/accounts']); };

  protected getTypeLabel = (type: number): string => AccountTypeLabels[type as AccountType] ?? '';
  protected getTypeIcon = (type: number): string => AccountTypeIcons[type as AccountType] ?? 'fa-wallet';
  protected formatCurrency = this.formatterService.formatCurrency;

  // app-text devuelve string
  private toNumberOrNull = (value: number | string | null | undefined): number | null =>
    value === null || value === undefined || value === '' || isNaN(+value) ? null : +value;

  private toMonthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
}
