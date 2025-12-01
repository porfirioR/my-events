import { Component, OnInit, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { useTransactionStore, useLoadingStore } from '../../store';
import { FormatterHelperService, AlertService } from '../../services';

@Component({
  selector: 'app-transaction-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './transaction-details.component.html',
  styleUrls: ['./transaction-details.component.css']
})
export class TransactionDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly alertService = inject(AlertService);
  private formatterService = inject(FormatterHelperService);

  private readonly transactionStore = useTransactionStore();
  private readonly loadingStore = useLoadingStore();

  protected isLoading = this.loadingStore.isLoading;
  protected transactionDetails = this.transactionStore.selectedTransactionDetails;
  
  protected formatCurrency = this.formatterService.formatCurrency;
  protected getFormattedDate = FormatterHelperService.getFormattedDate;

  private transactionId: number = 0;

  constructor() {
    effect(() => {
      const details = this.transactionDetails();
      if (details) {
        console.log('Transaction Details:', details);
      }
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.transactionId = parseInt(id);
      this.transactionStore.loadTransactionDetails(this.transactionId);
    } else {
      this.router.navigate(['/transactions']);
    }
  }

  protected getInitials(fullName: string): string {
    return FormatterHelperService.getInitials(fullName);
  }

  protected goBack(): void {
    this.location.back();
  }

  protected navigateToTransactions(): void {
    this.transactionStore.clearSelectedTransactionDetails();
    this.router.navigate(['/transactions']);
  }

  protected addReimbursement(): void {
    const details = this.transactionDetails();
    if (details) {
      // TODO: Open reimbursement modal
      console.log('Add reimbursement to transaction:', details.id);
    }
  }

  protected settleTransaction(): void {
    const details = this.transactionDetails();
    if (!details) return;

    const confirmMsg = `Mark this transaction as settled?\n${details.description}\nAmount: ${this.formatCurrency(details.netAmount, 1)}`;
    
    this.alertService.showQuestionModal('Mark as Settled?', confirmMsg).then(result => {
      if (result && result.isConfirmed) {
        this.transactionStore.settleTransaction(details.id);
        this.alertService.showSuccess('Transaction marked as settled');
        // Reload details
        this.transactionStore.loadTransactionDetails(this.transactionId);
      }
    });
  }

  protected deleteTransaction(): void {
    const details = this.transactionDetails();
    if (!details) return;

    const confirmMsg = `Delete this transaction?\n${details.description}\nAmount: ${this.formatCurrency(details.netAmount, 1)}\n\nThis action cannot be undone.`;
    
    this.alertService.showQuestionModal('Delete Transaction?', confirmMsg).then(result => {
      if (result && result.isConfirmed) {
        this.transactionStore.deleteTransaction(details.id);
        this.alertService.showSuccess('Transaction deleted successfully');
        this.navigateToTransactions();
      }
    });
  }
}