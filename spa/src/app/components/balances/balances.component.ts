import { ChangeDetectionStrategy, Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Location } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { useCurrencyStore, useTransactionStore } from '../../store';
import { FormatterHelperService } from '../../services';
import { LocalizedDatePipe } from '../../pipes';
import { BalanceApiModel, TransactionViewApiModel } from '../../models/api/transactions';
import { CollaboratorBalanceViewModel, MonthlyBalanceSummaryViewModel } from '../../models/view';


@Component({
  selector: 'app-balances',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    RouterModule,
    LocalizedDatePipe,
  ],
  templateUrl: './balances.component.html',
  styleUrls: ['./balances.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BalancesComponent implements OnInit {
  private readonly transactionStore = useTransactionStore();
  private readonly currencyStore = useCurrencyStore();
  private readonly location = inject(Location);
  private formatterService = inject(FormatterHelperService);
  private readonly recentLimit = 8;
  private readonly monthsLimit = 12;

  // Signals
  protected isBalancesLoaded = this.transactionStore.isBalancesLoaded;
  protected isTransactionsLoaded = this.transactionStore.isTransactionsLoaded;
  protected expandedBalanceId = signal<number | null>(null);

  // Computed from store
  protected balances = computed(() => this.transactionStore.balances());
  protected totalBalance = computed(() => this.transactionStore.totalBalance());
  protected totalTheyOwe = computed(() => this.transactionStore.totalTheyOwe());
  protected totalIOwe = computed(() => this.transactionStore.totalIOwe());

  protected balanceViews = computed<CollaboratorBalanceViewModel[]>(() => {
    const pendingByCollaborator = new Map<number, TransactionViewApiModel[]>();
    for (const transaction of this.transactionStore.transactions()) {
      if (transaction.isSettled) continue;
      const list = pendingByCollaborator.get(transaction.myCollaborator.id) ?? [];
      list.push(transaction);
      pendingByCollaborator.set(transaction.myCollaborator.id, list);
    }

    return [...this.balances()]
      .sort((a, b) => Math.abs(b.netBalance) - Math.abs(a.netBalance))
      .map(balance => this.buildView(balance, pendingByCollaborator.get(balance.collaboratorId) ?? []));
  });

  // For Math functions in template
  protected math = Math;
  protected formatCurrency =  this.formatterService.formatCurrency
  protected getInitials = FormatterHelperService.getInitials

  ngOnInit(): void {
    // Always reload both transactions and balances to get the most current data
    // Balances are calculated from transactions, so we need both datasets fresh
    // This ensures we reflect any new transactions, settlements, or payments
    this.transactionStore.reloadTransactions();
    this.transactionStore.reloadBalances();
    this.currencyStore.loadCurrencies();
  }

  protected toggleBalanceDetails(collaboratorId: number): void {
    if (this.expandedBalanceId() === collaboratorId) {
      this.expandedBalanceId.set(null);
    } else {
      this.expandedBalanceId.set(collaboratorId);
    }
  }

  protected goBack(): void {
    this.location.back();
  }

  // Monto con signo desde mi perspectiva: + me deben, - les debo
  protected getSignedAmount(transaction: TransactionViewApiModel): number {
    return transaction.theyOwe - transaction.iOwe;
  }

  private buildView(balance: BalanceApiModel, pending: TransactionViewApiModel[]): CollaboratorBalanceViewModel {
    const sorted = [...pending].sort((a, b) => this.toTime(b.transactionDate) - this.toTime(a.transactionDate));

    const monthsMap = new Map<string, MonthlyBalanceSummaryViewModel>();
    for (const transaction of sorted) {
      const date = new Date(transaction.transactionDate);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const month = monthsMap.get(key) ?? new MonthlyBalanceSummaryViewModel(key, new Date(date.getFullYear(), date.getMonth(), 1));
      month.theyOwe += transaction.theyOwe;
      month.iOwe += transaction.iOwe;
      monthsMap.set(key, month);
    }

    const total = balance.collaboratorOwes + balance.userOwes;
    const larger = Math.max(balance.collaboratorOwes, balance.userOwes);
    const smaller = Math.min(balance.collaboratorOwes, balance.userOwes);

    return new CollaboratorBalanceViewModel(
      balance,
      sorted.length,
      sorted.length ? new Date(sorted[0].transactionDate) : null,
      sorted.length ? new Date(sorted[sorted.length - 1].transactionDate) : null,
      larger > 0 ? Math.round((smaller / larger) * 100) : 0,
      total > 0 ? (balance.collaboratorOwes / total) * 100 : 0,
      [...monthsMap.values()].slice(0, this.monthsLimit),
      sorted.slice(0, this.recentLimit),
    );
  }

  private toTime(date: Date | string): number {
    return new Date(date).getTime();
  }
}
