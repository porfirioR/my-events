import { Component, OnInit, signal, computed, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TransactionViewApiModel } from '../../models/api/transactions';
import { useCollaboratorStore, useLoadingStore, useTransactionStore } from '../../store';
import { AlertService, FormatterHelperService } from '../../services';
import { AddReimbursementModalComponent } from '../add-reimbursement-modal/add-reimbursement-modal.component';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    AddReimbursementModalComponent,
    RouterLink
  ],
  templateUrl: './transactions.component.html',
  styleUrls: ['./transactions.component.css']
})
export class TransactionsComponent implements OnInit {
  @ViewChild(AddReimbursementModalComponent) addReimbursementModal: AddReimbursementModalComponent | undefined
  private readonly transactionStore = useTransactionStore();
  private readonly collaboratorStore = useCollaboratorStore();
  private readonly loadingStore = useLoadingStore();
  private readonly alertService = inject(AlertService);
  private readonly translate = inject(TranslateService);
  private formatterService = inject(FormatterHelperService);

  // Signals
  protected isLoading = this.loadingStore.isLoading;
  protected filterType = signal<'all' | 'my-created' | 'their-created' | 'unsettled'>('all');

  protected formatCurrency = this.formatterService.formatCurrency
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

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    // Cargar transacciones
    this.transactionStore.loadTransactions();
    
    // Cargar colaboradores si no están cargados
    if (this.collaboratorStore.totalCount() === 0) {
      this.collaboratorStore.loadCollaborators();
    }
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

  protected deleteTransaction(transaction: TransactionViewApiModel): void {
    const description = transaction.description || this.translate.instant('transactions.noDescription');
    const amount = this.formatCurrency(transaction.netAmount, 4);
    
    const confirmMsg = this.translate.instant('transactions.confirmDeleteDescription', {
      description,
      amount
    });

    this.alertService.showQuestionModal(
      this.translate.instant('transactions.confirmDelete'), 
      confirmMsg
    ).then(x => {
      if (x && x.isConfirmed) {
        this.transactionStore.deleteTransaction(transaction.id);
        this.alertService.showSuccess(
          this.translate.instant('transactions.transactionDeleted')
        );
      }
    })
  }

  protected settleTransaction(transaction: TransactionViewApiModel): void {
    const description = transaction.description || this.translate.instant('transactions.noDescription');
    const amount = this.formatCurrency(transaction.netAmount, 4);
    
    const confirmMsg = this.translate.instant('transactions.confirmSettleDescription', {
      description,
      amount
    });

    this.alertService.showQuestionModal(
      this.translate.instant('transactions.confirmSettle'), 
      confirmMsg
    ).then(x => {
      if (x && x.isConfirmed) {
        this.transactionStore.settleTransaction(transaction.id);
        this.alertService.showSuccess(
          this.translate.instant('transactions.transactionSettled')
        );
      }
    })
  }
}