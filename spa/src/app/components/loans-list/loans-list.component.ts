import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { useLoansStore, useLoadingStore } from '../../store';
import { AlertService, FormatterHelperService } from '../../services';
import { LoanEntity, LoanEntityLabels, LoanType, LoanTypeLabels, LoanTypeBadgeColors } from '../../models/enums';
import { ConfirmDialogComponent, ConfirmDialogResult } from '../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-loans-list',
  templateUrl: './loans-list.component.html',
  styleUrls: ['./loans-list.component.css'],
  imports: [CommonModule, RouterModule, TranslateModule, ConfirmDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoansListComponent implements OnInit {
  @ViewChild(ConfirmDialogComponent) confirmDialog!: ConfirmDialogComponent;
  private pendingCallback: ((result: ConfirmDialogResult) => void) | null = null;

  private router = inject(Router);
  private alertService = inject(AlertService);
  private formatterService = inject(FormatterHelperService);
  private translate = inject(TranslateService);

  private loansStore = useLoansStore();
  protected loadingStore = useLoadingStore();

  protected isLoading = this.loadingStore.isLoading;
  protected filterStatus = signal<number | null>(1);
  protected filterLoanType = signal<number | null>(null);

  protected LoanEntity = LoanEntity;
  protected LoanEntityLabels = LoanEntityLabels;
  protected LoanType = LoanType;
  protected LoanTypeLabels = LoanTypeLabels;
  protected LoanTypeBadgeColors = LoanTypeBadgeColors;

  protected loans = computed(() => {
    let filtered = this.loansStore.sortedLoans();
    const status = this.filterStatus();
    if (status !== null) filtered = filtered.filter(l => l.statusId === status);
    const type = this.filterLoanType();
    if (type !== null) filtered = filtered.filter(l => l.loanTypeId === type);
    return filtered;
  });

  ngOnInit(): void {
    this.loansStore.reloadLoans();
  }

  protected setStatusFilter(statusId: number | null): void {
    this.filterStatus.set(statusId);
  }

  protected setTypeFilter(typeId: number | null): void {
    this.filterLoanType.set(typeId);
  }

  protected create(): void {
    this.router.navigate(['/loans/create']);
  }

  protected viewDetail(loan: any): void {
    this.router.navigate(['/loans', loan.id]);
  }

  protected editLoan(loan: any): void {
    this.router.navigate(['/loans', loan.id, 'edit']);
  }

  protected onConfirmResult(result: ConfirmDialogResult): void {
    this.pendingCallback?.(result);
    this.pendingCallback = null;
  }

  protected deleteLoan(loan: any): void {
    this.pendingCallback = (result) => {
      if (result.confirmed) {
        this.loansStore.deleteLoan(loan.id);
        this.alertService.showSuccess(this.translate.instant('loans.deletedSuccess'));
      }
    };
    this.confirmDialog.open({
      title: this.translate.instant('loans.deleteTitle'),
      message: this.translate.instant('loans.deleteMessage', { name: loan.name }),
      type: 'warning',
    });
  }

  protected getProgress(loan: any): number {
    if (!loan.actualTotalAmount) return 0;
    return Math.min(Math.round((loan.totalPaid / loan.actualTotalAmount) * 100), 100);
  }

  protected getEntityLabel(loan: any): string {
    if (loan.loanEntityId === LoanEntity.Otros && loan.lenderCustomName) {
      return loan.lenderCustomName;
    }
    return LoanEntityLabels[loan.loanEntityId as LoanEntity] ?? '';
  }

  protected getStatusColor(statusId: number): string {
    const colors: Record<number, string> = { 1: 'badge-warning', 2: 'badge-success', 3: 'badge-neutral', 4: 'badge-error' };
    return colors[statusId] ?? 'badge-ghost';
  }

  protected getStatusLabel(statusId: number): string {
    const labels: Record<number, string> = { 1: 'loans.statusActive', 2: 'loans.statusCompleted', 3: 'loans.statusPaused', 4: 'loans.statusCancelled' };
    return labels[statusId] ?? '';
  }

  protected getStatusIcon(statusId: number): string {
    const icons: Record<number, string> = { 1: 'fa-clock', 2: 'fa-circle-check', 3: 'fa-pause', 4: 'fa-ban' };
    return icons[statusId] ?? 'fa-circle';
  }

  protected getLoanTypeLabel = (typeId: number): string =>
    LoanTypeLabels[typeId as LoanType] ?? '';

  protected getLoanTypeBadgeColor = (typeId: number): string =>
    LoanTypeBadgeColors[typeId as LoanType] ?? '';

  protected formatCurrency = this.formatterService.formatCurrency;
  protected getFormattedDate = (dateStr: string): string =>
    this.formatterService.getFormattedDateCustom(new Date(dateStr));
}
