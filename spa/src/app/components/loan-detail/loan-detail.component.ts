import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, DestroyRef, OnInit,
  inject, signal, computed, effect,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AlertService, BreadcrumbService, FormatterHelperService } from '../../services';
import { useCurrencyStore, useFinancialInstitutionsStore, useLoansStore } from '../../store';
import { PayLoanInstallmentApiRequest } from '../../models/api/loans';
import { TextComponent } from '../inputs/text/text.component';
import { DateInputComponent } from '../inputs/date-input/date-input.component';
import { TextAreaInputComponent } from '../inputs/text-area-input/text-area-input.component';
import { NextInstallmentAlertComponent } from '../next-installment-alert/next-installment-alert.component';
import { InstallmentsTableComponent } from '../installments-table/installments-table.component';
import { MovementsListComponent } from '../movements-list/movements-list.component';
import { DetailFieldViewModel, InstallmentColumnViewModel, InstallmentRowViewModel, MovementViewModel } from '../../models/view';
import { DetailStatCardsComponent } from '../detail-stat-cards/detail-stat-cards.component';
import { DetailProgressComponent } from '../detail-progress/detail-progress.component';
import { DetailInfoGridComponent } from '../detail-info-grid/detail-info-grid.component';
import { LoanType, LoanTypeLabels, LoanDirection, LoanDirectionLabels, LoanDirectionBadgeColors, LoanDirectionIcons, AmortizationType } from '../../models/enums';

// Textos que cambian en un préstamo otorgado: los pagos son cobros (loanDetail.lent.*)
const LENT_KEYS = new Set([
  'remaining', 'totalPaid', 'totalInterest', 'totalAmount', 'pay', 'paymentHistory', 'noPayments',
  'payInstallment', 'payAmount', 'paymentDate', 'confirmPay', 'paidSuccess', 'paidError',
]);

@Component({
  selector: 'app-loan-detail',
  templateUrl: './loan-detail.component.html',
  styleUrls: ['./loan-detail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, TranslateModule, TextComponent, DateInputComponent, TextAreaInputComponent,
    NextInstallmentAlertComponent, InstallmentsTableComponent, MovementsListComponent,
    DetailStatCardsComponent, DetailProgressComponent, DetailInfoGridComponent],
})
export class LoanDetailComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private alertService = inject(AlertService);
  private formatterService = inject(FormatterHelperService);
  private translate = inject(TranslateService);
  private loansStore = useLoansStore();
  private currencyStore = useCurrencyStore();
  private financialInstitutionsStore = useFinancialInstitutionsStore();

  protected loan = this.loansStore.selectedLoan;
  protected installments = this.loansStore.installments;
  protected payments = this.loansStore.payments;
  protected nextInstallment = this.loansStore.nextInstallment;
  protected progress = this.loansStore.selectedLoanProgress;
  protected remaining = this.loansStore.selectedLoanRemaining;

  protected LoanType = LoanType;
  protected LoanTypeLabels = LoanTypeLabels;
  protected AmortizationType = AmortizationType;

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

  protected isLent = computed(() => this.loan()?.direction === LoanDirection.Lent);

  protected key = (key: string): string =>
    this.isLent() && LENT_KEYS.has(key) ? `loanDetail.lent.${key}` : `loanDetail.${key}`;

  private breadcrumbService = inject(BreadcrumbService);
  // Muestra el nombre del préstamo en el breadcrumb (en vez de "#id")
  private breadcrumbLabel = effect(() => {
    const l = this.loan();
    if (l) this.breadcrumbService.setLabel(`/loans/${l.id}`, l.name);
  });

  protected canAct = computed(() => this.loan()?.statusId === 1);

  protected statCards = computed<DetailFieldViewModel[]>(() => {
    const l = this.loan();
    if (!l) return [];
    return [
      new DetailFieldViewModel('loanDetail.principal', this.formatCurrency(l.principalAmount, l.currencyId)),
      new DetailFieldViewModel(this.key('remaining'), this.formatCurrency(this.remaining(), l.currencyId), 'text-warning'),
      new DetailFieldViewModel(this.key('totalPaid'), this.formatCurrency(l.totalPaid, l.currencyId), 'text-success'),
      new DetailFieldViewModel('loanDetail.installment', this.formatCurrency(l.actualInstallmentAmount, l.currencyId), '', '', 'loanDetail.perMonth'),
    ];
  });

  protected infoFields = computed<DetailFieldViewModel[]>(() => {
    const l = this.loan();
    if (!l) return [];
    const money = (amount: number) => this.formatCurrency(amount, l.currencyId);
    const fields = [
      new DetailFieldViewModel('loanDetail.calculatedInstallment', money(l.calculatedInstallmentAmount)),
      // En un otorgado el interés es ganancia
      new DetailFieldViewModel(this.key('totalInterest'), money(l.calculatedTotalInterest), this.isLent() ? 'text-success' : 'text-error'),
      new DetailFieldViewModel(this.key('totalAmount'), money(l.actualTotalAmount)),
      new DetailFieldViewModel('loanDetail.startDate', this.formatDate(l.startDate)),
    ];
    if (l.expectedEndDate) fields.push(new DetailFieldViewModel('loanDetail.expectedEnd', this.formatDate(l.expectedEndDate)));
    if (l.completedDate) fields.push(new DetailFieldViewModel('loanDetail.completedDate', this.formatDate(l.completedDate), 'text-success'));
    if (l.administrativeFees) fields.push(new DetailFieldViewModel('loanDetail.administrativeFees', money(l.administrativeFees)));
    if (l.ivaPercentage) {
      fields.push(new DetailFieldViewModel('loanDetail.ivaOnInterest', `${money(l.calculatedTotalInterest * l.ivaPercentage / 100)} (${l.ivaPercentage}%)`));
    }
    if (l.insuranceAmount) fields.push(new DetailFieldViewModel('loanDetail.insurance', money(l.insuranceAmount)));
    return fields;
  });

  protected installmentColumns = computed(() => [
    new InstallmentColumnViewModel('principal', 'loanDetail.capital', 'text-primary'),
    // En un otorgado el interés es ganancia
    new InstallmentColumnViewModel('interest', 'loanDetail.interest', this.isLent() ? 'text-success' : 'text-error'),
    new InstallmentColumnViewModel('balance', 'loanDetail.balance', 'text-base-content/70'),
  ]);

  protected installmentRows = computed(() => this.installments().map(i => new InstallmentRowViewModel(
    i.id, i.installmentNumber, i.dueDate, i.totalAmount, i.statusId, i.paidDate,
    { principal: i.principalAmount, interest: i.interestAmount, balance: i.remainingBalance },
  )));

  protected movementItems = computed(() => {
    const numberById = new Map(this.installments().map(i => [i.id, i.installmentNumber]));
    return this.payments().map(p => new MovementViewModel(
      p.id, p.amount, p.paymentDate, p.description, false,
      p.installmentId !== null ? numberById.get(p.installmentId) ?? null : null,
    ));
  });

  protected entityLabel = computed(() => {
    const l = this.loan();
    if (!l) return '';
    // En un préstamo otorgado lendercustomname es el deudor
    if (this.isLent()) return l.lenderCustomName ?? '';
    const financialInstitution = this.financialInstitutionsStore.financialInstitutionsById().get(l.loanEntityId);
    if (!financialInstitution?.isOther) return financialInstitution?.name ?? '';
    return l.lenderCustomName || this.translate.instant('loans.entityOtros');
  });

  ngOnInit(): void {
    const id = this.activatedRoute.snapshot.params['id'];
    if (!id) { this.router.navigate(['/loans']); return; }
    this.loansStore.clearSelectedLoan();
    this.loansStore.loadLoanById(+id);
    this.loansStore.loadInstallments(+id);
    this.loansStore.loadPayments(+id);
    this.currencyStore.loadCurrencies();
    this.financialInstitutionsStore.loadFinancialInstitutions();
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
    const request = new PayLoanInstallmentApiRequest(+vals.amount!,vals.description ?? null, vals.paymentDate!);

    this.loansStore.payInstallment(loanId, installmentId, request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.alertService.showSuccess(this.translate.instant(this.key('paidSuccess')));
          this.closePayModal();
        },
        error: (e) => {
          this.isSaving.set(false);
          this.alertService.showError(this.translate.instant(this.key('paidError')));
          throw e;
        },
      });
  }

  protected skipInstallment(installmentId: number): void {
    const loanId = this.loan()?.id;
    if (!loanId) return;
    this.loansStore.skipInstallment(loanId, installmentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.alertService.showSuccess(this.translate.instant('loanDetail.skippedSuccess')),
        error: (e) => { this.alertService.showError(this.translate.instant('loanDetail.skippedError')); throw e; },
      });
  }

  protected back(): void {
    this.router.navigate(['/loans']);
  }

  protected edit(): void {
    const id = this.loan()?.id;
    if (id) this.router.navigate(['/loans', id, 'edit']);
  }

  protected getStatusColor(statusId: number): string {
    const colors: Record<number, string> = { 1: 'badge-success', 2: 'badge-info', 3: 'badge-ghost', 4: 'badge-error' };
    return colors[statusId] ?? 'badge-ghost';
  }

  protected getStatusLabel(statusId: number): string {
    const labels: Record<number, string> = { 1: 'loans.statusActive', 2: 'loans.statusCompleted', 3: 'loans.statusPaused', 4: 'loans.statusCancelled' };
    return labels[statusId] ?? '';
  }

  protected formatCurrency = this.formatterService.formatCurrency;
  protected formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    // Date-only DB columns arrive as UTC midnight ("YYYY-MM-DDT00:00:00.000Z").
    // Re-parse as local midnight to avoid showing the previous day in UTC- timezones.
    const normalized = dateStr.length > 10 && dateStr.substring(10) === 'T00:00:00.000Z'
      ? dateStr.substring(0, 10) + 'T00:00:00'
      : dateStr;
    return this.formatterService.getFormattedDateCustom(new Date(normalized));
  };

  protected loanTypeLabel = (typeId: number): string =>
    LoanTypeLabels[typeId as LoanType] ?? '';
  protected directionLabel = (direction: number): string =>
    LoanDirectionLabels[(direction ?? LoanDirection.Borrowed) as LoanDirection] ?? '';
  protected directionBadgeColor = (direction: number): string =>
    LoanDirectionBadgeColors[(direction ?? LoanDirection.Borrowed) as LoanDirection] ?? '';
  protected directionIcon = (direction: number): string =>
    LoanDirectionIcons[(direction ?? LoanDirection.Borrowed) as LoanDirection] ?? '';
}
