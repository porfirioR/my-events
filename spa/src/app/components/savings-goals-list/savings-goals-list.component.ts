import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { useLoadingStore, useSavingsStore } from '../../store';
import { AlertService, FormatterHelperService } from '../../services';
import { GoalStatus, GoalStatusColors, GoalStatusIcons, GoalStatusLabels, MovementType, ProgressionType, ProgressionTypeIcons, ProgressionTypeLabels } from '../../models/enums';
import { ConfirmDialogComponent, ConfirmDialogResult } from '../confirm-dialog/confirm-dialog.component';
import { MutualFundMovementModalComponent } from '../mutual-fund-movement-modal/mutual-fund-movement-modal.component';

@Component({
  selector: 'app-savings-goals-list',
  templateUrl: './savings-goals-list.component.html',
  styleUrls: ['./savings-goals-list.component.css'],
  imports: [CommonModule, RouterModule, TranslateModule, ConfirmDialogComponent, MutualFundMovementModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SavingsGoalsListComponent implements OnInit {
  @ViewChild(ConfirmDialogComponent) confirmDialog!: ConfirmDialogComponent;
  @ViewChild(MutualFundMovementModalComponent) mutualFundModal!: MutualFundMovementModalComponent;
  private pendingCallback: ((result: ConfirmDialogResult) => void) | null = null;

  private router = inject(Router);
  private alertService = inject(AlertService);
  private formatterService = inject(FormatterHelperService);
  private translate = inject(TranslateService);

  private savingsStore = useSavingsStore();
  private loadingStore = useLoadingStore();

  protected isLoading = this.loadingStore.isLoading;
  protected filterStatus = signal<number | null>(GoalStatus.Active);
  protected filterProgressionType = signal<number | null>(null);

  // Enums para el template
  protected GoalStatus = GoalStatus;
  protected GoalStatusLabels = GoalStatusLabels;
  protected GoalStatusIcons = GoalStatusIcons;
  protected GoalStatusColors = GoalStatusColors;
  protected ProgressionType = ProgressionType;
  protected ProgressionTypeLabels = ProgressionTypeLabels;

  protected goals = computed(() => {
    let filtered = this.savingsStore.filteredGoals();
    
    const statusFilter = this.filterStatus();
    if (statusFilter !== null) {
      filtered = filtered.filter(g => g.statusId === statusFilter);
    }

    const typeFilter = this.filterProgressionType();
    if (typeFilter !== null) {
      filtered = filtered.filter(g => g.progressionTypeId === typeFilter);
    }

    return filtered;
  });

  ngOnInit(): void {
    this.savingsStore.reloadGoals();
  }

  protected setStatusFilter(statusId: number | null): void {
    this.filterStatus.set(statusId);
  }

  protected setProgressionTypeFilter(typeId: number | null): void {
    this.filterProgressionType.set(typeId);
  }

  protected create(): void {
    this.router.navigate(['/savings/create']);
  }

  protected viewDetail(goal: any): void {
    this.router.navigate(['/savings', goal.id]);
  }

  protected editGoal(goal: any): void {
    this.router.navigate(['/savings', goal.id, 'edit']);
  }

  protected onConfirmResult(result: ConfirmDialogResult): void {
    this.pendingCallback?.(result);
    this.pendingCallback = null;
  }

  protected deleteGoal(goal: any): void {
    this.pendingCallback = (result) => {
      if (result.confirmed) {
        this.savingsStore.deleteGoal(goal.id);
        this.alertService.showSuccess(this.translate.instant('savingsGoals.goalDeletedSuccess'));
      }
    };
    this.confirmDialog.open({
      title: this.translate.instant('savingsGoals.deleteGoalTitle'),
      message: this.translate.instant('savingsGoals.deleteGoalMessage', { name: goal.name }),
      type: 'warning'
    });
  }

  protected getGoalStatusLabel = FormatterHelperService.getGoalStatusLabel.bind(this.formatterService);
  protected getGoalStatusIcon = FormatterHelperService.getGoalStatusIcon.bind(this.formatterService);
  protected getGoalStatusColor = FormatterHelperService.getGoalStatusColor.bind(this.formatterService);
  protected getProgressionTypeLabel = FormatterHelperService.getProgressionTypeLabel.bind(this.formatterService);
  protected getProgressionTypeIcon = FormatterHelperService.getProgressionTypeIcon.bind(this.formatterService);
  protected getProgressionTypeBadgeColor = FormatterHelperService.getProgressionTypeBadgeColor.bind(this.formatterService);
  protected getFormattedDate = this.formatterService.getFormattedDateCustom.bind(this.formatterService);
  protected formatCurrency = this.formatterService.formatCurrency;

  protected isDepositType(goal: any): boolean {
    return goal.progressionTypeId === ProgressionType.FixedDeposit || goal.progressionTypeId === ProgressionType.CDA;
  }

  protected isMutualFund(goal: any): boolean {
    return goal.progressionTypeId === ProgressionType.MutualFund;
  }

  protected MovementType = MovementType;

  protected openMutualFundModal(goal: any, movementType: number): void {
    this.mutualFundModal.open({
      goalId: goal.id,
      currencyId: goal.currencyId,
      currentAmount: goal.currentAmount,
      annualRatePercentage: goal.annualRatePercentage,
      startDate: goal.startDate,
      movementType,
    });
  }

  protected getProgressTarget(goal: { progressionTypeId: number; targetAmount: number; baseAmount?: number | null; numberOfInstallments?: number | null; currentAmount?: number }): number {
    if (this.isDepositType(goal)) {
      return goal.baseAmount ?? goal.targetAmount;
    }
    if (goal.progressionTypeId === ProgressionType.Scheduled && goal.baseAmount && goal.numberOfInstallments) {
      return goal.baseAmount * goal.numberOfInstallments;
    }
    if (goal.progressionTypeId === ProgressionType.MutualFund) {
      // No fixed target — show the current balance as a full bar instead of dividing by zero
      return goal.currentAmount || 1;
    }
    return goal.targetAmount;
  }

  protected calculateProgress(current: number, target: number): number {
    if (target === 0) return 0;
    return Math.min(Math.round((current / target) * 100), 100);
  }

  protected getGoalProgress(goal: any): number {
    return this.calculateProgress(goal.currentAmount, this.getProgressTarget(goal));
  }

  protected getMaturityGain(goal: any): number {
    return Math.max(0, goal.targetAmount - (goal.baseAmount ?? goal.targetAmount));
  }

  protected getDepositTimeProgress(goal: any): number {
    if (!goal.startDate || !goal.numberOfInstallments) return 0;
    const start = new Date(this.normalizeDate(String(goal.startDate)));
    const end = goal.expectedEndDate
      ? new Date(this.normalizeDate(String(goal.expectedEndDate)))
      : new Date(start.getFullYear(), start.getMonth() + goal.numberOfInstallments, start.getDate());
    const now = new Date();
    if (now >= end) return 100;
    const total = end.getTime() - start.getTime();
    const elapsed = Math.max(0, now.getTime() - start.getTime());
    return Math.min(Math.round((elapsed / total) * 100), 100);
  }

  protected getMonthsElapsed(dateStr: any): number {
    const start = new Date(this.normalizeDate(String(dateStr)));
    const now = new Date();
    return Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()));
  }

  private normalizeDate(s: string): string {
    return s.length > 10 && s.substring(10) === 'T00:00:00.000Z' ? s.substring(0, 10) + 'T00:00:00' : s;
  }
}