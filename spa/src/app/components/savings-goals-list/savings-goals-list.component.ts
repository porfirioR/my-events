import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { useLoadingStore, useSavingsStore } from '../../store';
import { AlertService, FormatterHelperService, } from '../../services';
import { GoalStatus, GoalStatusColors, GoalStatusIcons, GoalStatusLabels, ProgressionType, ProgressionTypeIcons, ProgressionTypeLabels } from '../../models/enums';

@Component({
  selector: 'app-savings-goals-list',
  templateUrl: './savings-goals-list.component.html',
  styleUrls: ['./savings-goals-list.component.css'],
  imports: [CommonModule, RouterModule]
})
export class SavingsGoalsListComponent implements OnInit {
  private router = inject(Router);
  private alertService = inject(AlertService);
  private formatterService = inject(FormatterHelperService);

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
    this.savingsStore.loadGoals();
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

  protected async deleteGoal(goal: any): Promise<void> {
    const result = await this.alertService.showQuestionModal(
      'Delete Savings Goal',
      `Are you sure you want to delete "${goal.name}"? This action cannot be undone.`,
      'warning'
    );

    if (result.value) {
      this.savingsStore.deleteGoal(goal.id);
      this.alertService.showSuccess('Savings goal deleted successfully');
    }
  }

  protected getGoalStatusLabel = FormatterHelperService.getGoalStatusLabel;
  protected getGoalStatusIcon = FormatterHelperService.getGoalStatusIcon;
  protected getGoalStatusColor = FormatterHelperService.getGoalStatusColor;
  protected getProgressionTypeLabel = FormatterHelperService.getProgressionTypeLabel;
  protected getProgressionTypeIcon = FormatterHelperService.getProgressionTypeIcon;
  protected getFormattedDate = FormatterHelperService.getFormattedDate;
  protected formatCurrency = this.formatterService.formatCurrency;

  protected calculateProgress(current: number, target: number): number {
    if (target === 0) return 0;
    return Math.min(Math.round((current / target) * 100), 100);
  }
}