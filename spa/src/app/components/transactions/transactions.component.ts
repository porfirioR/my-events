import { Component, OnInit, signal, computed, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { TransactionViewApiModel } from '../../models/api/transactions';
import { useCollaboratorStore, useTransactionStore } from '../../store';
import { TransactionApiService } from '../../services/api/transaction-api.service';
import { HelperService } from '../../services';
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
  private readonly router = inject(Router);
  private readonly transactionApiService = inject(TransactionApiService);

  // Signals
  isLoading = signal<boolean>(false);
  filterType = signal<'all' | 'my-created' | 'their-created' | 'unsettled'>('all');

  // Computed - Transacciones filtradas
  transactions = computed(() => {
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
    this.isLoading.set(true);
    
    // Cargar transacciones
    this.transactionStore.loadTransactions();
    
    // Cargar colaboradores si no están cargados
    if (this.collaboratorStore.totalCount() === 0) {
      this.collaboratorStore.loadCollaborators();
    }

    setTimeout(() => this.isLoading.set(false), 2000);
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

  protected async addReimbursement(transaction: TransactionViewApiModel): Promise<void> {
    this.addReimbursementModal?.openDialog(transaction.netAmount, transaction.id)
    this.addReimbursementModal?.loadData.subscribe(x =>{
      if (x) {
        this.loadData()
      }
    })
  }

  protected async deleteTransaction(transaction: TransactionViewApiModel): Promise<void> {
    const result = await Swal.fire({
      title: 'Delete Transaction?',
      html: `
        <p>Are you sure you want to delete this transaction?</p>
        <p class="text-sm text-base-content/70 mt-2">
          ${transaction.description || 'No description'}<br/>
          Amount: ${this.formatCurrency(transaction.netAmount)}
        </p>
        <p class="text-error text-sm mt-4">This action cannot be undone.</p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel',
      customClass: {
        confirmButton: 'btn btn-error',
        cancelButton: 'btn btn-ghost'
      }
    });

    if (result.isConfirmed) {
      this.isLoading.set(true);
      
      this.transactionStore.deleteTransaction(transaction.id);
      
      setTimeout(() => {
        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: 'Transaction has been deleted',
          timer: 2000,
          showConfirmButton: false
        });
        this.isLoading.set(false);
      }, 500);
    }
  }

  protected async settleTransaction(transaction: TransactionViewApiModel): Promise<void> {
    const result = await Swal.fire({
      title: 'Mark as Settled?',
      html: `
        <p>Confirm that this transaction has been settled?</p>
        <p class="text-sm text-base-content/70 mt-2">
          ${transaction.description || 'No description'}<br/>
          Amount: ${this.formatCurrency(transaction.netAmount)}
        </p>
        <p class="text-warning text-sm mt-4">This action cannot be undone.</p>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, mark as settled',
      cancelButtonText: 'Cancel',
      customClass: {
        confirmButton: 'btn btn-success',
        cancelButton: 'btn btn-ghost'
      }
    });

    if (result.isConfirmed) {
      this.isLoading.set(true);

      this.transactionApiService.settleTransaction(transaction.id).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Settled!',
            text: 'Transaction has been marked as settled',
            timer: 2000,
            showConfirmButton: false
          });
          this.loadData();
        },
        error: (error) => {
          console.error('Error settling transaction:', error);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.error?.message || 'Failed to settle transaction'
          });
          this.isLoading.set(false);
        }
      });
    }
  }

  // ========== Formatters ==========
  protected formatCurrency = (amount: number): string => HelperService.formatCurrency(amount)

  protected getFormattedDate = (date: Date): string => HelperService.getFormattedDate(date, true);
}