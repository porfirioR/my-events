import { Component, OnInit, signal, computed, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TransactionViewApiModel } from '../../models/api/transactions';
import { useCollaboratorStore, useLoadingStore, useTransactionStore } from '../../store';
import { AlertService, HelperService } from '../../services';
import { AddReimbursementModalComponent } from '../add-reimbursement-modal/add-reimbursement-modal.component';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [
    CommonModule,
    AddReimbursementModalComponent
  ],
  templateUrl: './transactions.component.html',
  styleUrls: ['./transactions.component.css']
})
export class TransactionsComponent implements OnInit {
  @ViewChild(AddReimbursementModalComponent) addReimbursementModal: AddReimbursementModalComponent | undefined
  private readonly transactionStore = useTransactionStore();
  private readonly collaboratorStore = useCollaboratorStore();
  private readonly loadingStore = useLoadingStore();
  
  private readonly router = inject(Router);
  private readonly alertService = inject(AlertService);

  // Signals
  isLoading = this.loadingStore.isLoading;
  filterType = signal<'all' | 'my-created' | 'their-created' | 'unsettled'>('all');

  protected formatCurrency = HelperService.formatCurrency
  protected getFormattedDate = HelperService.getFormattedDate;

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
  protected createTransaction(): void {
    this.router.navigate(['/transactions/new']);
  }

  protected viewTransaction(transaction: TransactionViewApiModel): void {
    this.router.navigate(['/transactions', transaction.id]);
  }

  protected viewBalances(): void {
    this.router.navigate(['/transactions/balances']);
  }

  protected addReimbursement(transaction: TransactionViewApiModel): void {
    this.addReimbursementModal?.open({
      maxAmount: transaction.netAmount,
      transactionId: transaction.id
    });
  }

  protected deleteTransaction(transaction: TransactionViewApiModel): void {
    const confirmMsg = `Description: ${transaction.description}, with amount: ${this.formatCurrency(transaction.netAmount)}
    This action cannot be undone.`
    this.alertService.showQuestionModal('Are you sure you want to delete this transaction?', confirmMsg).then(x => {
      if (x && x.isConfirmed) {
        this.transactionStore.deleteTransaction(transaction.id);
        this.alertService.showSuccess(`Transaction was delete successfully`);
      }
    })
  }

  protected settleTransaction(transaction: TransactionViewApiModel): void {
    const confirmMsg = `Confirm that this transaction has been settled? ${transaction.description}, with amount: ${this.formatCurrency(transaction.netAmount)}`
    this.alertService.showQuestionModal('Mark as Settled?', confirmMsg).then(x => {
      if (x && x.isConfirmed) {
        this.transactionStore.settleTransaction(transaction.id);
        this.alertService.showSuccess(`Transaction has been marked as settled`);
      }
    })
  }
}