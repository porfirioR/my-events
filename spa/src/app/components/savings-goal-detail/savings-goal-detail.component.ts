// src/app/components/savings-goal-detail/savings-goal-detail.component.ts

import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, computed, signal } from '@angular/core';
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
} from '../../models/api/savings';

@Component({
  selector: 'app-savings-goal-detail',
  templateUrl: './savings-goal-detail.component.html',
  styleUrls: ['./savings-goal-detail.component.css'],
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
})
export class SavingsGoalDetailComponent implements OnInit {
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private alertService = inject(AlertService);

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
  protected payForm: FormGroup;

  protected showFreeFormModal = signal(false);
  protected freeFormDepositForm: FormGroup;

  protected showAddInstallmentsModal = signal(false);
  protected addInstallmentsForm: FormGroup;

  // Active tab
  protected activeTab = signal<'installments' | 'deposits'>('installments');

  protected isFreeForm = computed(() => {
    const g = this.goal();
    return g?.progressionTypeId === ProgressionType.FreeForm;
  });

  protected canAddInstallments = computed(() => {
    const g = this.goal();
    if (!g) return false;
    return (
      g.progressionTypeId !== ProgressionType.Descending &&
      g.progressionTypeId !== ProgressionType.FreeForm &&
      g.statusId === GoalStatus.Active
    );
  });

  constructor() {
    this.payForm = new FormGroup({
      amount: new FormControl(null, [Validators.required, Validators.min(1)]),
      description: new FormControl(''),
    });

    this.freeFormDepositForm = new FormGroup({
      amount: new FormControl(null, [Validators.required, Validators.min(1)]),
      description: new FormControl(''),
    });

    this.addInstallmentsForm = new FormGroup({
      numberOfNewInstallments: new FormControl(null, [
        Validators.required,
        Validators.min(1),
      ]),
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

  protected openPayModal(installment: any): void {
    this.selectedInstallment.set(installment);
    this.payForm.patchValue({
      amount: installment.amount,
      description: '',
    });
    this.showPayModal.set(true);
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
    const values = this.payForm.value;

    const request = new PayInstallmentApiRequest(
      values.amount!,
      values.description || undefined
    );

    this.savingsStore.payInstallment(goalId, installmentId, request).subscribe({
      next: () => {
        this.alertService.showSuccess('Installment paid successfully');
        this.closePayModal();
        this.reloadData();
      },
      error: (e) => {
        this.alertService.showError('Failed to pay installment');
        throw e;
      },
    });
  }

  // ==================== FREEFORM DEPOSIT ====================

  protected openFreeFormModal(): void {
    const maxAmount = this.remaining();
    this.freeFormDepositForm.patchValue({
      amount: null,
      description: '',
    });
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

    // Validar que no exceda el remaining
    if (values.amount! > this.remaining()) {
      this.alertService.showError(
        `Amount cannot exceed remaining: ${FormatterHelperService.formatCurrency(
          this.remaining()
        )}`
      );
      return;
    }

    const request = new CreateFreeFormDepositApiRequest(
      values.amount!,
      values.description || undefined
    );

    this.savingsStore.createFreeFormDeposit(goalId, request).subscribe({
      next: () => {
        this.alertService.showSuccess('Deposit created successfully');
        this.closeFreeFormModal();
        this.reloadData();
      },
      error: (e) => {
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
      values.numberOfNewInstallments!
    );

    this.savingsStore.addInstallments(goalId, request).subscribe({
      next: () => {
        this.alertService.showSuccess(
          `${values.numberOfNewInstallments} installments added successfully`
        );
        this.closeAddInstallmentsModal();
        this.reloadData();
      },
      error: (e) => {
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

  protected formatCurrency = FormatterHelperService.formatCurrency;
  protected getFormattedDate = FormatterHelperService.getFormattedDate;
}
