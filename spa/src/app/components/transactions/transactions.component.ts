import { ChangeDetectionStrategy, Component, OnInit, signal, computed, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TransactionViewApiModel } from '../../models/api/transactions';
import { useCollaboratorStore, useCurrencyStore, useTransactionStore } from '../../store';
import { AlertService, FormatterHelperService } from '../../services';
import { AddReimbursementModalComponent } from '../add-reimbursement-modal/add-reimbursement-modal.component';
import { ConfirmDialogComponent, ConfirmDialogResult } from '../confirm-dialog/confirm-dialog.component';
import { TransactionMonthGroupViewModel } from '../../models/view';
import { LocalizedDatePipe } from '../../pipes';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    AddReimbursementModalComponent,
    RouterLink,
    ConfirmDialogComponent,
    LocalizedDatePipe
  ],
  templateUrl: './transactions.component.html',
  styleUrls: ['./transactions.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TransactionsComponent implements OnInit {
  @ViewChild(AddReimbursementModalComponent) addReimbursementModal: AddReimbursementModalComponent | undefined;
  @ViewChild(ConfirmDialogComponent) confirmDialog!: ConfirmDialogComponent;
  private pendingCallback: ((result: ConfirmDialogResult) => void) | null = null;

  private readonly transactionStore = useTransactionStore();
  private readonly collaboratorStore = useCollaboratorStore();
  private readonly currencyStore = useCurrencyStore();
  private readonly alertService = inject(AlertService);
  private readonly translate = inject(TranslateService);
  private formatterService = inject(FormatterHelperService);

  // Signals
  // Flag del store y no el loading global (otros pedidos lo apagan antes de tiempo)
  protected isLoading = this.transactionStore.needsLoadingTransactions;
  protected filterType = signal<'all' | 'my-created' | 'their-created' | 'unsettled'>('all');

  protected formatCurrency = this.formatterService.formatCurrency
  protected math = Math;
  protected isReceived = TransactionMonthGroupViewModel.isReceived;
  protected getFormattedDate = this.formatterService.getFormattedDate.bind(this.formatterService);

  protected transactions = computed(() => {
    const filter = this.filterType();
    const allTransactions = this.transactionStore.transactions();

    switch (filter) {
      case 'my-created':
        return this.transactionStore.myCreatedTransactions();
      case 'their-created':
        return this.transactionStore.theirCreatedTransactions();
      case 'unsettled':
        return this.transactionStore.unsettledTransactions();
      default:
        return allTransactions;
    }
  });

  // Agrupadas por mes (más reciente primero) y dentro de cada mes de la más nueva a la más vieja
  protected monthGroups = computed<TransactionMonthGroupViewModel[]>(() => {
    const groups = new Map<string, TransactionMonthGroupViewModel>();
    const sorted = [...this.transactions()].sort((a, b) => this.toTime(b.transactionDate) - this.toTime(a.transactionDate));
    for (const transaction of sorted) {
      const date = new Date(transaction.transactionDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const group = groups.get(key) ?? new TransactionMonthGroupViewModel(key, new Date(date.getFullYear(), date.getMonth(), 1));
      group.transactions.push(transaction);
      groups.set(key, group);
    }
    return [...groups.values()];
  });

  // null = el usuario todavía no tocó nada: solo el mes más reciente queda abierto
  private expandedMonthKeys = signal<Set<string> | null>(null);
  protected allExpanded = computed(() => {
    const groups = this.monthGroups();
    return groups.length > 0 && groups.every(x => this.isMonthExpanded(x.key));
  });

  ngOnInit(): void {
    this.loadData();
  }

  // ========== Month accordion ==========
  protected isMonthExpanded(key: string): boolean {
    const expanded = this.expandedMonthKeys();
    return expanded === null ? this.monthGroups()[0]?.key === key : expanded.has(key);
  }

  protected toggleMonth(key: string): void {
    const expanded = new Set(this.monthGroups().filter(x => this.isMonthExpanded(x.key)).map(x => x.key));
    if (expanded.has(key)) expanded.delete(key);
    else expanded.add(key);
    this.expandedMonthKeys.set(expanded);
  }

  protected toggleAllMonths(): void {
    this.expandedMonthKeys.set(this.allExpanded() ? new Set() : new Set(this.monthGroups().map(x => x.key)));
  }

  private toTime(date: Date | string): number {
    return new Date(date).getTime();
  }

  private loadData(): void {
    // Cargar transacciones
    this.transactionStore.loadTransactions();

    // Cargar colaboradores si no están cargados
    if (this.collaboratorStore.totalCount() === 0) {
      this.collaboratorStore.loadCollaborators();
    }

    // Necesarias para formatCurrency
    this.currencyStore.loadCurrencies();
  }

  // ========== Filters ==========
  protected setFilter(type: 'all' | 'my-created' | 'their-created' | 'unsettled'): void {
    this.filterType.set(type);
  }

  // ========== Actions ==========
  protected addReimbursement(transaction: TransactionViewApiModel): void {
    this.addReimbursementModal?.open({
      maxAmount: transaction.netAmount,
      transactionId: transaction.id
    });
  }

  protected onConfirmResult(result: ConfirmDialogResult): void {
    this.pendingCallback?.(result);
    this.pendingCallback = null;
  }

  protected deleteTransaction(transaction: TransactionViewApiModel): void {
    const description = transaction.description || this.translate.instant('transactions.noDescription');
    const amount = this.formatCurrency(transaction.netAmount, 4);

    this.pendingCallback = (result) => {
      if (result.confirmed) {
        this.transactionStore.deleteTransaction(transaction.id);
        this.alertService.showSuccess(this.translate.instant('transactions.transactionDeleted'));
      }
    };
    this.confirmDialog.open({
      title: this.translate.instant('transactions.confirmDelete'),
      message: this.translate.instant('transactions.confirmDeleteDescription', { description, amount }),
      type: 'error'
    });
  }

  protected settleTransaction(transaction: TransactionViewApiModel): void {
    const description = transaction.description || this.translate.instant('transactions.noDescription');
    const amount = this.formatCurrency(transaction.netAmount, 4);

    this.pendingCallback = (result) => {
      if (result.confirmed) {
        this.transactionStore.settleTransaction(transaction.id);
        this.alertService.showSuccess(this.translate.instant('transactions.transactionSettled'));
      }
    };
    this.confirmDialog.open({
      title: this.translate.instant('transactions.confirmSettle'),
      message: this.translate.instant('transactions.confirmSettleDescription', { description, amount }),
      type: 'warning'
    });
  }
}