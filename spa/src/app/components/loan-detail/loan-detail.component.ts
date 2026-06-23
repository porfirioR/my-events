import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, DestroyRef, OnInit,
  inject, signal, computed,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AlertService, FormatterHelperService } from '../../services';
import { useLoansStore } from '../../store';
import { PayLoanInstallmentApiRequest } from '../../models/api/loans';
import { LoanEntity, LoanEntityLabels, LoanType, LoanTypeLabels, InstallmentStatus, InstallmentStatusBadgeColors, InstallmentStatusColors, InstallmentStatusIcons, InstallmentStatusLabels } from '../../models/enums';

@Component({
  selector: 'app-loan-detail',
  templateUrl: './loan-detail.component.html',
  styleUrls: ['./loan-detail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, TranslateModule],
})
export class LoanDetailComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private alertService = inject(AlertService);
  private formatterService = inject(FormatterHelperService);
  private translate = inject(TranslateService);
  private loansStore = useLoansStore();

  protected loan = this.loansStore.selectedLoan;
  protected installments = this.loansStore.installments;
  protected payments = this.loansStore.payments;
  protected nextInstallment = this.loansStore.nextInstallment;
  protected progress = this.loansStore.selectedLoanProgress;
  protected remaining = this.loansStore.selectedLoanRemaining;

  protected LoanEntity = LoanEntity;
  protected LoanEntityLabels = LoanEntityLabels;
  protected LoanType = LoanType;
  protected LoanTypeLabels = LoanTypeLabels;
  protected InstallmentStatus = InstallmentStatus;
  protected InstallmentStatusBadgeColors = InstallmentStatusBadgeColors;
  protected InstallmentStatusColors = InstallmentStatusColors;
  protected InstallmentStatusIcons = InstallmentStatusIcons;
  protected InstallmentStatusLabels = InstallmentStatusLabels;

  protected activeTab = signal<'table' | 'payments'>('table');
  protected payingInstallmentId = signal<number | null>(null);
  protected isSaving = signal(false);

  protected payForm = new FormGroup({
    amount: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
    description: new FormControl(''),
    paymentDate: new FormControl(
      new Date().toISOString().substring(0, 10),
      [Validators.required]
    ),
  });

  protected entityLabel = computed(() => {
    const l = this.loan();
    if (!l) return '';
    if (l.loanEntityId === LoanEntity.Otros && l.lenderCustomName) return l.lenderCustomName;
    return LoanEntityLabels[l.loanEntityId as LoanEntity] ?? '';
  });

  ngOnInit(): void {
    const id = this.activatedRoute.snapshot.params['id'];
    if (!id) { this.router.navigate(['/loans']); return; }
    this.loansStore.loadLoanById(+id);
    this.loansStore.loadInstallments(+id);
    this.loansStore.loadPayments(+id);
  }

  protected setTab(tab: 'table' | 'payments'): void {
    this.activeTab.set(tab);
  }

  protected openPayModal(installmentId: number): void {
    const inst = this.installments().find(i => i.id === installmentId);
    this.payForm.patchValue({
      amount: inst?.totalAmount ?? null,
      description: '',
      paymentDate: new Date().toISOString().substring(0, 10),
    });
    this.payingInstallmentId.set(installmentId);
    (document.getElementById('pay-modal') as HTMLDialogElement)?.showModal();
  }

  protected closePayModal(): void {
    this.payingInstallmentId.set(null);
    (document.getElementById('pay-modal') as HTMLDialogElement)?.close();
  }

  protected confirmPay(): void {
    if (this.payForm.invalid) { this.payForm.markAllAsTouched(); return; }
    const loanId = this.loan()?.id;
    const installmentId = this.payingInstallmentId();
    if (!loanId || !installmentId) return;

    this.isSaving.set(true);
    const vals = this.payForm.getRawValue();
    const request = new PayLoanInstallmentApiRequest(vals.amount!, vals.description ?? null, vals.paymentDate!);

    this.loansStore.payInstallment(loanId, installmentId, request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.alertService.showSuccess(this.translate.instant('loanDetail.paidSuccess'));
          this.closePayModal();
        },
        error: (e) => {
          this.isSaving.set(false);
          this.alertService.showError(this.translate.instant('loanDetail.paidError'));
          throw e;
        },
      });
  }

  protected skipInstallment(installmentId: number): void {
    const loanId = this.loan()?.id;
    if (!loanId) return;
    this.loansStore.skipInstallment({ loanId, installmentId });
    this.alertService.showSuccess(this.translate.instant('loanDetail.skippedSuccess'));
  }

  protected back(): void {
    this.router.navigate(['/loans']);
  }

  protected edit(): void {
    const id = this.loan()?.id;
    if (id) this.router.navigate(['/loans', id, 'edit']);
  }

  protected getStatusColor(statusId: number): string {
    const colors: Record<number, string> = { 1: 'badge-warning', 2: 'badge-success', 3: 'badge-neutral', 4: 'badge-error' };
    return colors[statusId] ?? 'badge-ghost';
  }

  protected getStatusLabel(statusId: number): string {
    const labels: Record<number, string> = { 1: 'loans.statusActive', 2: 'loans.statusCompleted', 3: 'loans.statusPaused', 4: 'loans.statusCancelled' };
    return labels[statusId] ?? '';
  }

  protected formatCurrency = this.formatterService.formatCurrency;
  protected formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    return this.formatterService.getFormattedDateCustom(new Date(dateStr));
  };

  protected instBadgeColor = (statusId: number): string =>
    InstallmentStatusBadgeColors[statusId as InstallmentStatus] ?? 'badge-ghost';
  protected instIcon = (statusId: number): string =>
    InstallmentStatusIcons[statusId as InstallmentStatus] ?? '';
  protected instLabel = (statusId: number): string =>
    InstallmentStatusLabels[statusId as InstallmentStatus] ?? '';
  protected loanTypeLabel = (typeId: number): string =>
    LoanTypeLabels[typeId as LoanType] ?? '';
}
