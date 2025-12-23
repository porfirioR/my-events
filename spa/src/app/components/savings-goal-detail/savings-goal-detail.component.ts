import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, computed, signal, effect } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { useSavingsStore } from '../../store/savings.store';
import { AlertService, FormatterHelperService } from '../../services';
import { GoalStatus, ProgressionType } from '../../models/enums';
import {
  PayInstallmentApiRequest,
  CreateFreeFormDepositApiRequest,
  AddInstallmentsApiRequest,
  SavingsInstallmentApiModel,
} from '../../models/api/savings';
import { TextComponent } from '../inputs/text/text.component';
import { TextAreaInputComponent } from '../inputs/text-area-input/text-area-input.component';
import { ProgressionTypeFormGroup } from '../../models/forms';

@Component({
  selector: 'app-savings-goal-detail',
  templateUrl: './savings-goal-detail.component.html',
  styleUrls: ['./savings-goal-detail.component.css'],
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    TextComponent,
    TextAreaInputComponent,
  ],
})
export class SavingsGoalDetailComponent implements OnInit {
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private alertService = inject(AlertService);
  private formatterService = inject(FormatterHelperService);
  private savingsStore = useSavingsStore();

  protected goal = this.savingsStore.selectedGoal;
  protected installments = this.savingsStore.installments;
  protected deposits = this.savingsStore.sortedDeposits;
  protected progress = this.savingsStore.selectedGoalProgress;
  protected remaining = this.savingsStore.selectedGoalRemaining;
  protected pendingInstallments = this.savingsStore.pendingInstallments;
  protected paidInstallments = this.savingsStore.paidInstallments;

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

  protected canAddInstallments = computed(() => {
    const goal = this.goal();
    if (!goal) return false;
    return (
      goal.progressionTypeId !== ProgressionType.Descending &&
      goal.progressionTypeId !== ProgressionType.FreeForm &&
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
      if (this.isFreeForm() && this.activeTab() === 'installments') {
        this.setActiveTab('deposits');
      }
    });
  }

  ngOnInit(): void {
    const id = +this.activatedRoute.snapshot.params['id'];
    this.savingsStore.loadGoalById(id);
    this.savingsStore.loadInstallments(id);
    this.savingsStore.loadDeposits(id);
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
    this.savingsStore.payInstallment(goalId, installmentId, request).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.alertService.showSuccess('Installment paid successfully');
        this.closePayModal();
        this.reloadData();
      },
      error: (e) => {
        this.isSubmitting.set(false);
        this.alertService.showError('Failed to pay installment');
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

    this.savingsStore.createFreeFormDeposit(goalId, request).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.alertService.showSuccess('Deposit created successfully');
        this.closeFreeFormModal();
        this.reloadData();
      },
      error: (e) => {
        this.isSubmitting.set(false);
        this.alertService.showError('Failed to create deposit');
        throw e;
      },
    });
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
    this.savingsStore.addInstallments(goalId, request).subscribe({
      next: () => {
        this.alertService.showSuccess(
          `${values.numberOfNewInstallments} installments added successfully`
        );
        this.isSubmitting.set(false);
        this.closeAddInstallmentsModal();
        this.reloadData();
      },
      error: (e) => {
        this.isSubmitting.set(false);
        this.alertService.showError('Failed to add installments');
        throw e;
      },
    });
  }

  // ==================== SKIP INSTALLMENT ====================

  protected async skipInstallment(installment: any): Promise<void> {
    const result = await this.alertService.showQuestionModal(
      'Skip Installment',
      `Are you sure you want to skip installment #${installment.installmentNumber}?`,
      'warning'
    );

    if (result.value) {
      const goalId = this.goal()!.id;
      this.savingsStore.skipInstallment({
        goalId,
        installmentId: installment.id,
      });
      this.alertService.showSuccess('Installment skipped');
    }
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

  protected getGoalStatusLabel = FormatterHelperService.getGoalStatusLabel;
  protected getGoalStatusIcon = FormatterHelperService.getGoalStatusIcon;
  protected getGoalStatusColor = FormatterHelperService.getGoalStatusColor;
  protected getProgressionTypeLabel = FormatterHelperService.getProgressionTypeLabel;

  protected formatCurrency = this.formatterService.formatCurrency;
  protected getFormattedDate = this.formatterService.getFormattedDate.bind(this.formatterService);
}
