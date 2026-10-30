import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, ViewChild, inject, computed, signal, effect } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { useSavingsStore } from '../../store/savings.store';
import { useCurrencyStore } from '../../store/currency.store';
import { useFinancialInstitutionsStore } from '../../store/financial-institutions.store';
import { AlertService, BreadcrumbService, FormatterHelperService } from '../../services';
import { GoalStatus, InstallmentStatus, MovementType, ProgressionType } from '../../models/enums';
import { DetailFieldViewModel, InstallmentColumnViewModel, InstallmentRowViewModel, MovementViewModel } from '../../models/view';
import { NextInstallmentAlertComponent } from '../next-installment-alert/next-installment-alert.component';
import { InstallmentsTableComponent } from '../installments-table/installments-table.component';
import { MovementsListComponent } from '../movements-list/movements-list.component';
import { DetailStatCardsComponent } from '../detail-stat-cards/detail-stat-cards.component';
import { DetailProgressComponent } from '../detail-progress/detail-progress.component';
import { DetailInfoGridComponent } from '../detail-info-grid/detail-info-grid.component';
import {
  PayInstallmentApiRequest,
  CreateFreeFormDepositApiRequest,
  AddInstallmentsApiRequest,
  SavingsInstallmentApiModel,
  WithdrawSavingsGoalApiRequest,
} from '../../models/api/savings';
import { TextComponent } from '../inputs/text/text.component';
import { DateInputComponent } from '../inputs/date-input/date-input.component';
import { TextAreaInputComponent } from '../inputs/text-area-input/text-area-input.component';
import { ProgressionTypeFormGroup } from '../../models/forms';
import { ConfirmDialogComponent, ConfirmDialogResult } from '../confirm-dialog/confirm-dialog.component';
import { MutualFundMovementModalComponent } from '../mutual-fund-movement-modal/mutual-fund-movement-modal.component';

@Component({
  selector: 'app-savings-goal-detail',
  templateUrl: './savings-goal-detail.component.html',
  styleUrls: ['./savings-goal-detail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    TranslateModule,
    TextComponent,
    TextAreaInputComponent,
    DateInputComponent,
    ConfirmDialogComponent,
    MutualFundMovementModalComponent,
    NextInstallmentAlertComponent,
    InstallmentsTableComponent,
    MovementsListComponent,
    DetailStatCardsComponent,
    DetailProgressComponent,
    DetailInfoGridComponent,
  ],
})
export class SavingsGoalDetailComponent implements OnInit {
  @ViewChild(ConfirmDialogComponent) confirmDialog!: ConfirmDialogComponent;
  @ViewChild(MutualFundMovementModalComponent) mutualFundModal!: MutualFundMovementModalComponent;
  private pendingCallback: ((result: ConfirmDialogResult) => void) | null = null;

  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private alertService = inject(AlertService);
  private formatterService = inject(FormatterHelperService);
  private translate = inject(TranslateService);
  private savingsStore = useSavingsStore();
  private currencyStore = useCurrencyStore();
  private financialInstitutionsStore = useFinancialInstitutionsStore();

  protected goal = this.savingsStore.selectedGoal;
  private breadcrumbService = inject(BreadcrumbService);
  // Muestra el nombre de la meta en el breadcrumb (en vez de "#id")
  private breadcrumbLabel = effect(() => {
    const goal = this.goal();
    if (goal) this.breadcrumbService.setLabel(`/savings/${goal.id}`, goal.name);
  });
  protected financialInstitutionName = computed(() => {
    const institutionId = this.goal()?.institutionId;
    if (!institutionId) return '';
    return this.financialInstitutionsStore.financialInstitutionsById().get(institutionId)?.name ?? '';
  });
  protected installments = this.savingsStore.installments;
  protected deposits = this.savingsStore.sortedDeposits;
  protected progress = this.savingsStore.selectedGoalProgress;
  protected remaining = this.savingsStore.selectedGoalRemaining;
  protected pendingInstallments = this.savingsStore.pendingInstallments;
  protected paidInstallments = this.savingsStore.paidInstallments;
  protected skippedInstallments = this.savingsStore.skippedInstallments;

  // Programmed savings
  protected isProgrammedSavings = computed(() => this.goal()?.progressionTypeId === ProgressionType.Scheduled);
  protected isFixedDeposit = computed(() => this.goal()?.progressionTypeId === ProgressionType.FixedDeposit);
  protected isCDA = computed(() => this.goal()?.progressionTypeId === ProgressionType.CDA);
  protected isLumpSum = computed(() => this.isFixedDeposit() || this.isCDA());
  protected nextInstallment = computed(() => this.pendingInstallments()[0] ?? null);
  protected programmedYield = computed(() => {
    const goal = this.goal();
    if (goal?.progressionTypeId !== ProgressionType.Scheduled || !goal.numberOfInstallments || !goal.baseAmount || !goal.annualRatePercentage) return null;
    const totalDeposited = goal.baseAmount * goal.numberOfInstallments;
    return {
      totalDeposited,
      yieldAmount: goal.targetAmount - totalDeposited,
      totalAmount: goal.targetAmount,
    };
  });

  protected fixedDepositMaturity = computed(() => {
    const goal = this.goal();
    if ((goal?.progressionTypeId !== ProgressionType.FixedDeposit && goal?.progressionTypeId !== ProgressionType.CDA) || !goal.baseAmount || !goal.annualRatePercentage || !goal.numberOfInstallments) return null;
    const principal = goal.baseAmount;
    const interest = Math.round(principal * (goal.annualRatePercentage / 100) * (goal.numberOfInstallments / 12));
    return {
      principal,
      interest,
      totalAmount: goal.targetAmount,
      termMonths: goal.numberOfInstallments,
    };
  });

  // Enums
  protected GoalStatus = GoalStatus;

  // Modal state
  protected showPayModal = signal(false);
  protected selectedInstallment = signal<any>(null);
  protected payForm: FormGroup<ProgressionTypeFormGroup>;

  protected showFreeFormModal = signal(false);
  protected freeFormDepositForm: FormGroup<ProgressionTypeFormGroup>;

  protected showAddInstallmentsModal = signal(false);
  protected addInstallmentsForm: FormGroup;
  protected isSubmitting = signal<boolean>(false);

  // Active tab
  protected activeTab = signal<'installments' | 'deposits'>('installments');

  protected isFreeForm = computed(() => this.goal()?.progressionTypeId === ProgressionType.FreeForm);
  protected isMutualFund = computed(() => this.goal()?.progressionTypeId === ProgressionType.MutualFund);
  protected isRotating = computed(() => this.goal()?.progressionTypeId === ProgressionType.Rotating);
  protected MovementType = MovementType;

  // ==================== CABECERA (misma estructura que el detalle de préstamos) ====================
  // Monto contra el que se mide el progreso: capital en plazo fijo/CDA, total a depositar en ahorro programado
  protected progressTarget = computed(() => {
    const goal = this.goal();
    if (!goal) return 0;
    if (this.isLumpSum()) return goal.baseAmount ?? goal.targetAmount;
    if (this.isProgrammedSavings() && goal.baseAmount && goal.numberOfInstallments) return goal.baseAmount * goal.numberOfInstallments;
    return goal.targetAmount;
  });

  // 4 tarjetas de resumen arriba; cambian según el tipo de ahorro
  protected statCards = computed<DetailFieldViewModel[]>(() => {
    const goal = this.goal();
    if (!goal) return [];
    const money = (amount: number) => this.formatCurrency(amount, goal.currencyId);

    if (this.isMutualFund()) {
      const contributed = this.deposits().filter(d => d.movementType !== MovementType.Withdrawal).reduce((sum, d) => sum + d.amount, 0);
      const withdrawn = this.deposits().filter(d => d.movementType === MovementType.Withdrawal).reduce((sum, d) => sum + d.amount, 0);
      return [
        new DetailFieldViewModel('savingsGoalDetail.currentBalance', money(goal.currentAmount), 'text-success'),
        new DetailFieldViewModel('savingsGoalDetail.statContributed', money(contributed)),
        new DetailFieldViewModel('savingsGoalDetail.statWithdrawn', money(withdrawn), 'text-warning'),
        new DetailFieldViewModel('savingsGoalDetail.annualRateLabel', goal.annualRatePercentage ? `${goal.annualRatePercentage}%` : '—', 'text-success'),
      ];
    }

    if (this.isLumpSum()) {
      const maturity = this.fixedDepositMaturity();
      const accent = this.isCDA() ? 'text-secondary' : 'text-info';
      return [
        new DetailFieldViewModel('savingsGoalDetail.fixedDepositPrincipal', money(goal.baseAmount ?? 0)),
        new DetailFieldViewModel('savingsGoalDetail.fixedDepositInterest', maturity ? `+ ${money(maturity.interest)}` : '—', 'text-success'),
        new DetailFieldViewModel('savingsGoalDetail.fixedDepositTotalAtMaturity', money(goal.targetAmount), accent),
        new DetailFieldViewModel('savingsGoalDetail.termMonthsLabel', `${goal.numberOfInstallments ?? 0}`, '',
          goal.numberOfInstallments === 1 ? 'savingsGoalDetail.month' : 'savingsGoalDetail.months'),
      ];
    }

    const cards = [new DetailFieldViewModel('savingsGoalDetail.statTarget', money(this.progressTarget()))];
    cards.push(goal.statusId === GoalStatus.Withdrawn
      ? new DetailFieldViewModel('savingsGoalDetail.statPayout', money(goal.payoutAmount ?? goal.currentAmount), 'text-primary')
      : new DetailFieldViewModel('savingsGoalDetail.statRemaining', money(this.remaining()), 'text-warning'));
    cards.push(new DetailFieldViewModel('savingsGoalDetail.statSaved', money(goal.currentAmount), 'text-success'));
    if (this.hasInstallments()) {
      const installmentAmount = this.nextInstallment()?.amount ?? goal.baseAmount ?? 0;
      cards.push(new DetailFieldViewModel('savingsGoalDetail.statInstallment', money(installmentAmount), '', '',
        goal.paymentPeriod ? `upsertSavingsGoal.paymentPeriod${goal.paymentPeriod}` : ''));
    }
    return cards;
  });

  // Mismos colores que la lista de ahorros según el estado
  protected progressStyle = computed(() => {
    const styles: Record<number, { progressClass: string; textClass: string }> = {
      [GoalStatus.Active]: { progressClass: 'progress-success', textClass: 'text-success' },
      [GoalStatus.Completed]: { progressClass: 'progress-info', textClass: 'text-info' },
      [GoalStatus.Withdrawn]: { progressClass: 'progress-primary', textClass: 'text-primary' },
      [GoalStatus.Paused]: { progressClass: 'progress-warning', textClass: 'text-warning' },
      [GoalStatus.Cancelled]: { progressClass: 'progress-error', textClass: 'text-error' },
    };
    return styles[this.goal()?.statusId ?? GoalStatus.Active] ?? styles[GoalStatus.Active];
  });

  // Bloque de información (fechas, tasa, rendimiento); mismo formato que el resumen del préstamo
  protected infoFields = computed<DetailFieldViewModel[]>(() => {
    const goal = this.goal();
    if (!goal) return [];
    const money = (amount: number) => this.formatCurrency(amount, goal.currencyId);
    const fields = [new DetailFieldViewModel('savingsGoalDetail.startDate', this.getFormattedDate(goal.startDate))];

    if (goal.expectedEndDate) {
      const label = this.isLumpSum() ? 'savingsGoalDetail.maturityDate' : 'savingsGoalDetail.expectedEnd';
      fields.push(new DetailFieldViewModel(label, this.getFormattedDate(goal.expectedEndDate), this.isLumpSum() ? (this.isCDA() ? 'text-secondary' : 'text-info') : ''));
    }
    if (this.isRotating() && goal.payoutDate && goal.statusId !== GoalStatus.Withdrawn) {
      fields.push(new DetailFieldViewModel('savingsGoalDetail.estimatedPayoutLabel', this.getFormattedDate(goal.payoutDate), 'text-info'));
    }
    if (goal.completedDate) {
      fields.push(new DetailFieldViewModel('savingsGoalDetail.completedDate', this.getFormattedDate(goal.completedDate), 'text-success'));
    }
    if (goal.paymentPeriod) {
      fields.push(new DetailFieldViewModel('savingsGoalDetail.paymentPeriodLabel', '', '', `upsertSavingsGoal.paymentPeriod${goal.paymentPeriod}`));
    }

    const programmedYield = this.programmedYield();
    if (programmedYield) {
      fields.push(new DetailFieldViewModel('savingsGoalDetail.estimatedYield', `+ ${money(programmedYield.yieldAmount)}`, 'text-success'));
      fields.push(new DetailFieldViewModel('savingsGoalDetail.totalAtMaturity', money(programmedYield.totalAmount), 'text-success'));
    }
    return fields;
  });

  // ==================== CUOTAS Y MOVIMIENTOS (componentes compartidos con préstamos) ====================
  protected hasInstallments = computed(() => !this.isFreeForm() && !this.isLumpSum() && !this.isMutualFund());
  protected canActOnInstallments = computed(() => this.goal()?.statusId === GoalStatus.Active);

  protected installmentColumns = [
    new InstallmentColumnViewModel('accumulated', 'paymentSchedule.accumulated', 'text-base-content/70'),
  ];

  protected installmentRows = computed(() => {
    let accumulated = 0;
    return [...this.installments()]
      .sort((a, b) => a.installmentNumber - b.installmentNumber)
      .map(i => {
        // Acumulado según el cronograma: las omitidas no suman
        if (i.statusId !== InstallmentStatus.Skipped) accumulated += i.amount;
        return new InstallmentRowViewModel(i.id, i.installmentNumber, i.dueDate, i.amount, i.statusId, i.paidDate, { accumulated });
      });
  });

  protected movementItems = computed(() => {
    const numberById = new Map(this.installments().map(i => [i.id, i.installmentNumber]));
    return this.deposits().map(d => new MovementViewModel(
      d.id, d.amount, d.depositDate, d.description,
      this.isMutualFund() && d.movementType === MovementType.Withdrawal,
      d.installmentId !== null ? numberById.get(d.installmentId) ?? null : null,
    ));
  });

  protected payInstallmentRow(row: InstallmentRowViewModel): void {
    const installment = this.installments().find(i => i.id === row.id);
    if (installment) this.openPayModal(installment);
  }

  // Registrar cobro: el ahorro pasa a Withdrawn y deja de sumar al patrimonio
  protected canWithdraw = computed(() => {
    const statusId = this.goal()?.statusId;
    return !!statusId && statusId !== GoalStatus.Cancelled && statusId !== GoalStatus.Withdrawn;
  });
  protected showWithdrawModal = signal(false);
  protected withdrawForm = new FormGroup({
    payoutAmount: new FormControl<number | null>(null, [Validators.min(1)]),
    payoutDate: new FormControl<string | null>(null, [Validators.required]),
  });

  protected canAddInstallments = computed(() => {
    const goal = this.goal();
    if (!goal) return false;
    return (
      goal.progressionTypeId !== ProgressionType.Descending &&
      goal.progressionTypeId !== ProgressionType.FreeForm &&
      goal.progressionTypeId !== ProgressionType.Scheduled &&
      goal.progressionTypeId !== ProgressionType.FixedDeposit &&
      goal.progressionTypeId !== ProgressionType.CDA &&
      goal.progressionTypeId !== ProgressionType.MutualFund &&
      goal.progressionTypeId !== ProgressionType.Rotating &&
      goal.statusId === GoalStatus.Active
    );
  });

  constructor() {
    this.payForm = new FormGroup<ProgressionTypeFormGroup>({
      amount: new FormControl(null, [Validators.required, Validators.min(1)]),
      description: new FormControl(''),
    });

    this.freeFormDepositForm = new FormGroup<ProgressionTypeFormGroup>({
      amount: new FormControl(null, [Validators.required, Validators.min(1)]),
      description: new FormControl(''),
    });

    this.addInstallmentsForm = new FormGroup({
      numberOfNewInstallments: new FormControl(null, [
        Validators.required,
        Validators.min(1),
      ]),
    });

    effect(() => {
      if ((this.isFreeForm() || this.isLumpSum() || this.isMutualFund()) && this.activeTab() === 'installments') {
        this.setActiveTab('deposits');
      }
    });
  }

  ngOnInit(): void {
    const id = +this.activatedRoute.snapshot.params['id'];
    this.savingsStore.clearSelectedGoal();
    this.savingsStore.loadGoalById(id);
    this.savingsStore.loadInstallments(id);
    this.savingsStore.loadDeposits(id);
    this.savingsStore.loadProgrammedTerms();
    this.currencyStore.loadCurrencies();
    this.financialInstitutionsStore.loadFinancialInstitutions();
  }

  protected setActiveTab(tab: 'installments' | 'deposits'): void {
    this.activeTab.set(tab);
  }

  // ==================== PAY INSTALLMENT ====================

  protected openPayModal(installment: SavingsInstallmentApiModel): void {
    this.selectedInstallment.set(installment);
    this.payForm.patchValue({
      amount: installment.amount,
      description: '',
    });
    this.showPayModal.set(true);
    const goal = this.goal()
    if (
      goal?.progressionTypeId == ProgressionType.Ascending ||
      goal?.progressionTypeId == ProgressionType.Descending ||
      goal?.progressionTypeId == ProgressionType.Random
    ) {
      this.payForm.controls.amount.disable()
    }
  }

  protected closePayModal(): void {
    this.showPayModal.set(false);
    this.selectedInstallment.set(null);
    this.payForm.reset();
  }

  protected payInstallment(): void {
    if (this.payForm.invalid || !this.selectedInstallment()) return;

    const goalId = this.goal()!.id;
    const installmentId = this.selectedInstallment()!.id;
    const values = this.payForm.getRawValue();

    const request = new PayInstallmentApiRequest(
      values.amount!,
      values.description || undefined
    );
    this.isSubmitting.set(true);
    this.savingsStore.payInstallment(goalId, installmentId, request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.alertService.showSuccess(
          this.translate.instant('savingsGoalDetail.installmentPaidSuccess')
        );
        this.closePayModal();
        this.reloadData();
      },
      error: (e) => {
        this.isSubmitting.set(false);
        this.alertService.showError(
          this.translate.instant('savingsGoalDetail.installmentPaidError')
        );
        throw e;
      },
    });
  }

  // ==================== FREEFORM DEPOSIT ====================

  protected openFreeFormModal(): void {
    const maxAmount = this.remaining();
    this.freeFormDepositForm.reset()
    this.freeFormDepositForm.patchValue({
      amount: null,
      description: '',
    });
    this.freeFormDepositForm.controls.amount.addValidators(Validators.max(maxAmount))
    this.showFreeFormModal.set(true);
  }

  protected closeFreeFormModal(): void {
    this.showFreeFormModal.set(false);
    this.freeFormDepositForm.reset();
  }

  protected createFreeFormDeposit(): void {
    if (this.freeFormDepositForm.invalid) return;

    const goalId = this.goal()!.id;
    const values = this.freeFormDepositForm.value;

    const request = new CreateFreeFormDepositApiRequest(
      +values.amount!,
      values.description || undefined
    );
    this.isSubmitting.set(true);

    this.savingsStore.createFreeFormDeposit(goalId, request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.alertService.showSuccess(
          this.translate.instant('savingsGoalDetail.depositCreatedSuccess')
        );
        this.closeFreeFormModal();
        this.reloadData();
      },
      error: (e) => {
        this.isSubmitting.set(false);
        this.alertService.showError(
          this.translate.instant('savingsGoalDetail.depositCreatedError')
        );
        throw e;
      },
    });
  }

  // ==================== WITHDRAW (REGISTRAR COBRO) ====================

  protected openWithdrawModal(): void {
    const goal = this.goal();
    if (!goal) return;
    // Productos con vencimiento: se cobra el monto al vencimiento (con interés / pozo de la rueda);
    // fondo mutuo y metas: lo aportado
    const hasMaturityAmount = this.isProgrammedSavings() || this.isLumpSum() || this.isRotating();
    this.withdrawForm.reset({
      payoutAmount: (hasMaturityAmount ? goal.targetAmount : goal.currentAmount) || null,
      payoutDate: new Date().toISOString().substring(0, 10),
    });
    this.showWithdrawModal.set(true);
  }

  protected closeWithdrawModal(): void {
    this.showWithdrawModal.set(false);
    this.withdrawForm.reset();
  }

  protected withdrawGoal(): void {
    if (this.withdrawForm.invalid) return;

    const goalId = this.goal()!.id;
    const values = this.withdrawForm.value;
    const request = new WithdrawSavingsGoalApiRequest(
      values.payoutDate!,
      values.payoutAmount ? +values.payoutAmount : undefined,
    );
    this.isSubmitting.set(true);

    this.savingsStore.withdrawGoal(goalId, request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.alertService.showSuccess(this.translate.instant('savingsGoalDetail.withdrawnSuccess'));
        this.closeWithdrawModal();
      },
      error: (e) => {
        this.isSubmitting.set(false);
        this.alertService.showError(this.translate.instant('savingsGoalDetail.withdrawnError'));
        throw e;
      },
    });
  }

  // ==================== MUTUAL FUND MOVEMENT ====================

  protected openMutualFundModal(movementType: number): void {
    const goal = this.goal();
    if (!goal) return;
    this.mutualFundModal.open({
      goalId: goal.id,
      currencyId: goal.currencyId,
      currentAmount: goal.currentAmount,
      annualRatePercentage: goal.annualRatePercentage,
      startDate: goal.startDate,
      movementType,
    });
  }

  protected onMutualFundMovementCompleted(): void {
    this.reloadData();
  }

  // ==================== ADD INSTALLMENTS ====================

  protected openAddInstallmentsModal(): void {
    this.addInstallmentsForm.patchValue({
      numberOfNewInstallments: null,
    });
    this.showAddInstallmentsModal.set(true);
  }

  protected closeAddInstallmentsModal(): void {
    this.showAddInstallmentsModal.set(false);
    this.addInstallmentsForm.reset();
  }

  protected addInstallments(): void {
    if (this.addInstallmentsForm.invalid) return;

    const goalId = this.goal()!.id;
    const values = this.addInstallmentsForm.value;

    const request = new AddInstallmentsApiRequest(
      +values.numberOfNewInstallments!
    );
    this.isSubmitting.set(true);
    this.savingsStore.addInstallments(goalId, request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.alertService.showSuccess(
          this.translate.instant('savingsGoalDetail.installmentsAddedSuccess', {
            count: values.numberOfNewInstallments
          })
        );
        this.isSubmitting.set(false);
        this.closeAddInstallmentsModal();
        this.reloadData();
      },
      error: (e) => {
        this.isSubmitting.set(false);
        this.alertService.showError(
          this.translate.instant('savingsGoalDetail.installmentsAddedError')
        );
        throw e;
      },
    });
  }

  // ==================== SKIP INSTALLMENT ====================

  protected onConfirmResult(result: ConfirmDialogResult): void {
    this.pendingCallback?.(result);
    this.pendingCallback = null;
  }

  protected skipInstallment(installment: any): void {
    this.pendingCallback = (result) => {
      if (result.confirmed) {
        const goalId = this.goal()!.id;
        this.savingsStore.skipInstallment({ goalId, installmentId: installment.id });
        this.alertService.showSuccess(this.translate.instant('savingsGoalDetail.installmentSkipped'));
      }
    };
    this.confirmDialog.open({
      title: this.translate.instant('savingsGoalDetail.skipInstallmentTitle'),
      message: this.translate.instant('savingsGoalDetail.skipInstallmentMessage', { number: installment.installmentNumber }),
      type: 'warning'
    });
  }

  // ==================== NAVIGATION ====================

  protected editGoal(): void {
    this.router.navigate(['/savings', this.goal()!.id, 'edit']);
  }

  protected goBack(): void {
    this.router.navigate(['/savings']);
  }

  private reloadData(): void {
    const goalId = this.goal()!.id;
    this.savingsStore.loadGoalById(goalId);
    this.savingsStore.loadInstallments(goalId);
    this.savingsStore.loadDeposits(goalId);
  }

  protected getGoalStatusLabel = FormatterHelperService.getGoalStatusLabel.bind(this.formatterService);
  protected getGoalStatusIcon = FormatterHelperService.getGoalStatusIcon.bind(this.formatterService);
  protected getGoalStatusColor = FormatterHelperService.getGoalStatusColor.bind(this.formatterService);
  protected getProgressionTypeLabel = FormatterHelperService.getProgressionTypeLabel.bind(this.formatterService);
  protected getProgressionTypeBadgeColor = FormatterHelperService.getProgressionTypeBadgeColor.bind(this.formatterService);

  protected formatCurrency = this.formatterService.formatCurrency.bind(this.formatterService);
  protected getFormattedDate = this.formatterService.getFormattedDateCustom.bind(this.formatterService);
}