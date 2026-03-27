import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { useTransactionStore, useLoadingStore } from '../../store';
import { FormatterHelperService, AlertService } from '../../services';
import { AddReimbursementModalComponent } from "../add-reimbursement-modal/add-reimbursement-modal.component";
import { ConfirmDialogComponent, ConfirmDialogResult } from '../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-transaction-details',
  imports: [
    CommonModule,
    TranslateModule,
    AddReimbursementModalComponent,
    ConfirmDialogComponent
  ],
  templateUrl: './transaction-details.component.html',
  styleUrls: ['./transaction-details.component.css']
})
export class TransactionDetailsComponent implements OnInit {
  @ViewChild(AddReimbursementModalComponent) reimbursementModal: AddReimbursementModalComponent | undefined;
  @ViewChild(ConfirmDialogComponent) confirmDialog!: ConfirmDialogComponent;
  private pendingCallback: ((result: ConfirmDialogResult) => void) | null = null;

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
      this.reimbursementModal?.open({
        maxAmount: details.netAmount,
        transactionId: details.id
      });
    }
  }

  protected onReimbursementClosed(): void {
    this.transactionStore.loadTransactionDetails(this.transactionId);
  }

  protected onConfirmResult(result: ConfirmDialogResult): void {
    this.pendingCallback?.(result);
    this.pendingCallback = null;
  }

  protected settleTransaction(): void {
    const details = this.transactionDetails();
    if (!details) return;

    const description = details.description || this.translate.instant('transactionDetails.noDescription');
    const amount = this.formatCurrency(details.netAmount, 4);

    this.pendingCallback = (result) => {
      if (result.confirmed) {
        this.transactionStore.settleTransaction(details.id);
        this.alertService.showSuccess(this.translate.instant('transactions.transactionSettled'));
        this.transactionStore.loadTransactionDetails(this.transactionId);
      }
    };
    this.confirmDialog.open({
      title: this.translate.instant('transactionDetails.confirmSettle'),
      message: this.translate.instant('transactionDetails.confirmSettleMessage', { description, amount }),
      type: 'warning'
    });
  }

  protected deleteTransaction(): void {
    const details = this.transactionDetails();
    if (!details) return;

    const description = details.description || this.translate.instant('transactionDetails.noDescription');
    const amount = this.formatCurrency(details.netAmount, 4);

    this.pendingCallback = (result) => {
      if (result.confirmed) {
        this.transactionStore.deleteTransaction(details.id);
        this.alertService.showSuccess(this.translate.instant('transactions.transactionDeleted'));
        this.navigateToTransactions();
      }
    };
    this.confirmDialog.open({
      title: this.translate.instant('transactionDetails.deleteTransaction'),
      message: this.translate.instant('transactionDetails.deleteTransactionMessage', { description, amount }),
      type: 'error'
    });
  }
}