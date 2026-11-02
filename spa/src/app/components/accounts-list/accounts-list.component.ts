import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { useAccountsStore, useCurrencyStore, useFinancialInstitutionsStore } from '../../store';
import { AlertService, FormatterHelperService } from '../../services';
import { AccountApiModel } from '../../models/api/accounts';
import { AccountType, AccountTypeIcons, AccountTypeLabels, FinancialInstitutionType, FinancialInstitutionTypeIcons } from '../../models/enums';
import { ConfirmDialogComponent, ConfirmDialogResult } from '../confirm-dialog/confirm-dialog.component';
import { LanguageLocales } from '../../constants';

interface AccountGroup {
  institutionId: number;
  institutionName: string;
  institutionIcon: string;
  accounts: AccountApiModel[];
}

@Component({
  selector: 'app-accounts-list',
  templateUrl: './accounts-list.component.html',
  styleUrls: ['./accounts-list.component.css'],
  imports: [CommonModule, RouterModule, TranslateModule, ConfirmDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountsListComponent implements OnInit {
  @ViewChild(ConfirmDialogComponent) confirmDialog!: ConfirmDialogComponent;
  private pendingCallback: ((result: ConfirmDialogResult) => void) | null = null;

  private router = inject(Router);
  private alertService = inject(AlertService);
  private formatterService = inject(FormatterHelperService);
  private translate = inject(TranslateService);

  private accountsStore = useAccountsStore();
  private currencyStore = useCurrencyStore();
  private financialInstitutionsStore = useFinancialInstitutionsStore();

  // Flag del store y no el loading global (otros pedidos lo apagan antes de tiempo)
  protected isLoading = this.accountsStore.needsLoadingAccounts;
  // true = activas, false = inactivas, null = todas
  protected filterActive = signal<boolean | null>(true);

  private filteredAccounts = computed(() => {
    const active = this.filterActive();
    return this.accountsStore.accounts().filter(a => active === null || a.isActive === active);
  });

  // Agrupadas por entidad (orden alfabético) y dentro de cada una por nombre
  protected groups = computed<AccountGroup[]>(() => {
    const institutions = this.financialInstitutionsStore.financialInstitutionsById();
    const groups = new Map<number, AccountGroup>();
    this.filteredAccounts().forEach(account => {
      const institution = institutions.get(account.institutionId);
      if (!groups.has(account.institutionId)) {
        groups.set(account.institutionId, {
          institutionId: account.institutionId,
          institutionName: institution?.name ?? '',
          institutionIcon: FinancialInstitutionTypeIcons[(institution?.type ?? FinancialInstitutionType.Other) as FinancialInstitutionType],
          accounts: [],
        });
      }
      groups.get(account.institutionId)!.accounts.push(account);
    });
    return [...groups.values()]
      .map(group => ({ ...group, accounts: group.accounts.sort((a, b) => a.name.localeCompare(b.name)) }))
      .sort((a, b) => a.institutionName.localeCompare(b.institutionName));
  });

  // Total líquido de las cuentas activas, por moneda (no se suman monedas distintas)
  protected totalsByCurrency = computed(() => {
    const totals = new Map<number, number>();
    this.accountsStore.activeAccounts().forEach(account => {
      if (account.currentBalance === null) return;
      totals.set(account.currencyId, (totals.get(account.currencyId) ?? 0) + account.currentBalance);
    });
    return [...totals.entries()].map(([currencyId, total]) => ({ currencyId, total }));
  });

  ngOnInit(): void {
    this.accountsStore.reloadAccounts();
    this.currencyStore.loadCurrencies();
    this.financialInstitutionsStore.loadFinancialInstitutions();
  }

  protected setActiveFilter(active: boolean | null): void {
    this.filterActive.set(active);
  }

  protected create(): void {
    this.router.navigate(['/accounts/create']);
  }

  protected updateBalances(): void {
    this.router.navigate(['/accounts/balances']);
  }

  protected editAccount(account: AccountApiModel): void {
    this.router.navigate(['/accounts', account.id, 'edit']);
  }

  protected onConfirmResult(result: ConfirmDialogResult): void {
    this.pendingCallback?.(result);
    this.pendingCallback = null;
  }

  protected deleteAccount(account: AccountApiModel): void {
    this.pendingCallback = (result) => {
      if (result.confirmed) {
        this.accountsStore.deleteAccount(account.id);
        this.alertService.showSuccess(this.translate.instant('accounts.deletedSuccess'));
      }
    };
    this.confirmDialog.open({
      title: this.translate.instant('accounts.deleteTitle'),
      message: this.translate.instant('accounts.deleteMessage', { name: account.name }),
      type: 'warning',
    });
  }

  protected getTypeLabel = (type: number): string =>
    AccountTypeLabels[type as AccountType] ?? '';

  protected getTypeIcon = (type: number): string =>
    AccountTypeIcons[type as AccountType] ?? 'fa-wallet';

  protected getCurrencyName = (currencyId: number): string =>
    this.currencyStore.getCurrencyById()(currencyId)?.name ?? '';

  protected formatCurrency = this.formatterService.formatCurrency;

  // 'YYYY-MM-DD' (día 1) → "noviembre de 2026"
  protected formatMonth = (date: string): string => {
    const [year, month] = date.split('-').map(Number);
    const locale = LanguageLocales[this.translate.getCurrentLang()] ?? 'en-US';
    return new Date(year, month - 1, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  };
}
