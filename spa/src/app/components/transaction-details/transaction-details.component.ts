import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';  // ← Importar
import { useTransactionStore, useLoadingStore } from '../../store';
import { FormatterHelperService, AlertService } from '../../services';

@Component({
  selector: 'app-transaction-details',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule
  ],
  templateUrl: './transaction-details.component.html',
  styleUrls: ['./transaction-details.component.css']
})
export class TransactionDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly alertService = inject(AlertService);
  private readonly translate = inject(TranslateService);
  private formatterService = inject(FormatterHelperService);

  private readonly transactionStore = useTransactionStore();
  private readonly loadingStore = useLoadingStore();

  protected isLoading = this.loadingStore.isLoading;
  protected transactionDetails = this.transactionStore.selectedTransactionDetails;
  
  protected formatCurrency = this.formatterService.formatCurrency;
  protected getFormattedDate = this.formatterService.getFormattedDate.bind(this.formatterService);

  private transactionId: number = 0;

  constructor() {
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

    const description = details.description || this.translate.instant('transactionDetails.noDescription');
    const amount = this.formatCurrency(details.netAmount, 4);

    const confirmMsg = this.translate.instant('transactionDetails.confirmSettleMessage', {
      description,
      amount
    });

    this.alertService.showQuestionModal(
      this.translate.instant('transactionDetails.confirmSettle'),
      confirmMsg
    ).then(result => {
      if (result && result.isConfirmed) {
        this.transactionStore.settleTransaction(details.id);
        this.alertService.showSuccess(
          this.translate.instant('transactions.transactionSettled')
        );
        // Reload details
        this.transactionStore.loadTransactionDetails(this.transactionId);
      }
    });
  }

  protected deleteTransaction(): void {
    const details = this.transactionDetails();
    if (!details) return;

    const description = details.description || this.translate.instant('transactionDetails.noDescription');
    const amount = this.formatCurrency(details.netAmount, 4);

    const confirmMsg = this.translate.instant('transactionDetails.deleteTransactionMessage', {
      description,
      amount
    });

    this.alertService.showQuestionModal(
      this.translate.instant('transactionDetails.deleteTransaction'),
      confirmMsg
    ).then(result => {
      if (result && result.isConfirmed) {
        this.transactionStore.deleteTransaction(details.id);
        this.alertService.showSuccess(
          this.translate.instant('transactions.transactionDeleted')
        );
        this.navigateToTransactions();
      }
    });
  }
}