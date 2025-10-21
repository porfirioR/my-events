import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { TransactionViewApiModel } from '../../models/api/transactions';
import { useCollaboratorStore, useTransactionStore } from '../../store';
import { TransactionApiService } from '../../services/api/transaction-api.service';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './transactions.component.html',
  styleUrls: ['./transactions.component.css']
})
export class TransactionsComponent implements OnInit {
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

    setTimeout(() => this.isLoading.set(false), 1000);
  }

  // ========== Filters ==========
  setFilter(type: 'all' | 'my-created' | 'their-created' | 'unsettled'): void {
    this.filterType.set(type);
  }

  // ========== Actions ==========
  createTransaction(): void {
    this.router.navigate(['/transactions/new']);
  }

  viewTransaction(transaction: TransactionViewApiModel): void {
    this.router.navigate(['/transactions', transaction.id]);
  }

  viewBalances(): void {
    this.router.navigate(['/transactions/balances']);
  }

  async addReimbursement(transaction: TransactionViewApiModel): Promise<void> {
    const { value: formValues } = await Swal.fire({
      title: 'Add Reimbursement',
      html: `
        <div class="space-y-4">
          <div>
            <label class="label">
              <span class="label-text">Amount</span>
            </label>
            <input id="swal-amount" type="number" class="input input-bordered w-full" placeholder="Enter amount" min="0" step="0.01">
          </div>
          <div>
            <label class="label">
              <span class="label-text">Description (optional)</span>
            </label>
            <input id="swal-description" type="text" class="input input-bordered w-full" placeholder="Enter description">
          </div>
          <div class="alert alert-info">
            <i class="fas fa-info-circle"></i>
            <span>Transaction total: ${this.formatCurrency(transaction.totalAmount)}</span>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Add Reimbursement',
      cancelButtonText: 'Cancel',
      customClass: {
        confirmButton: 'btn btn-primary',
        cancelButton: 'btn btn-ghost'
      },
      preConfirm: () => {
        const amount = parseFloat((document.getElementById('swal-amount') as HTMLInputElement).value);
        const description = (document.getElementById('swal-description') as HTMLInputElement).value;

        if (!amount || amount <= 0) {
          Swal.showValidationMessage('Please enter a valid amount');
          return false;
        }

        if (amount > transaction.totalAmount) {
          Swal.showValidationMessage('Reimbursement cannot exceed transaction amount');
          return false;
        }

        return { amount, description: description || null };
      }
    });

    if (formValues) {
      this.isLoading.set(true);
      
      this.transactionStore.addReimbursement(transaction.id, {
        amount: formValues.amount,
        description: formValues.description
      }).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: 'Reimbursement added successfully',
            timer: 2000,
            showConfirmButton: false
          });
          this.loadData();
        },
        error: (error) => {
          console.error('Error adding reimbursement:', error);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.error?.message || 'Failed to add reimbursement'
          });
          this.isLoading.set(false);
        }
      });
    }
  }

  async deleteTransaction(transaction: TransactionViewApiModel): Promise<void> {
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

  async settleTransaction(transaction: TransactionViewApiModel): Promise<void> {
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
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0
    }).format(amount);
  }

  getFormattedDate(date: Date): string {
    const d = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - d.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}