import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import Swal from 'sweetalert2';
import { useTransactionStore } from '../../store';
import { HelperService } from '../../services';

@Component({
  selector: 'app-transaction-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './transaction-detail.component.html',
  styleUrls: ['./transaction-detail.component.css']
})
export class TransactionDetailComponent implements OnInit {
  private readonly transactionStore = useTransactionStore();
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  // Signals
  isLoading = signal<boolean>(false);
  transactionId = signal<number | null>(null);

  // Computed
  transaction = computed(() => {
    const id = this.transactionId();
    if (!id) return null;
    return this.transactionStore.transactions().find(t => t.id === id);
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.transactionId.set(parseInt(id));
      this.loadTransaction();
    }
  }

  private loadTransaction(): void {
    this.isLoading.set(true);
    const id = this.transactionId();
    if (id) {
      this.transactionStore.loadTransactionById(id);
    }
    setTimeout(() => this.isLoading.set(false), 500);
  }

  // ========== Actions ==========
  async addReimbursement(): Promise<void> {
    const trans = this.transaction();
    if (!trans) return;

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
            <span>Transaction total: ${this.formatCurrency(trans.totalAmount)}</span>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Add Reimbursement',
      preConfirm: () => {
        const amount = parseFloat((document.getElementById('swal-amount') as HTMLInputElement).value);
        const description = (document.getElementById('swal-description') as HTMLInputElement).value;

        if (!amount || amount <= 0) {
          Swal.showValidationMessage('Please enter a valid amount');
          return false;
        }

        if (amount > trans.totalAmount) {
          Swal.showValidationMessage('Reimbursement cannot exceed transaction amount');
          return false;
        }

        return { amount, description: description || null };
      }
    });

    if (formValues) {
      this.transactionStore.addReimbursement(trans.id, formValues).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: 'Reimbursement added successfully',
            timer: 2000,
            showConfirmButton: false
          });
          this.transactionStore.loadTransactions();
          this.loadTransaction();
        },
        error: (error) => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.error?.message || 'Failed to add reimbursement'
          });
        }
      });
    }
  }

  async deleteTransaction(): Promise<void> {
    const trans = this.transaction();
    if (!trans) return;

    const result = await Swal.fire({
      title: 'Delete Transaction?',
      text: 'This action cannot be undone',
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
      this.transactionStore.deleteTransaction(trans.id);

      Swal.fire({
        icon: 'success',
        title: 'Deleted!',
        text: 'Transaction has been deleted',
        timer: 2000,
        showConfirmButton: false
      });
      
      this.router.navigate(['/transactions']);
    }
  }

  protected goBack(): void {
    this.location.back();
  }

  // ========== Formatters ==========
  protected formatCurrency = (amount: number): string => HelperService.formatCurrency(amount)

  protected getFormattedDate = (date: Date): string => HelperService.getFormattedDate(date)
}