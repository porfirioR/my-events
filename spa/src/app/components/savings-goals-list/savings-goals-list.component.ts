import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { useCurrencyStore, useFinancialInstitutionsStore, useSavingsStore } from '../../store';
import { AlertService, FormatterHelperService } from '../../services';
import { GoalStatus, GoalStatusColors, GoalStatusIcons, GoalStatusLabels, MovementType, ProgressionType, ProgressionTypeIcons, ProgressionTypeLabels } from '../../models/enums';
import { ConfirmDialogComponent, ConfirmDialogResult } from '../confirm-dialog/confirm-dialog.component';
import { SavingsMovementModalComponent } from '../savings-movement-modal/savings-movement-modal.component';

interface MaturityBlock {
  leftLabel: string;
  leftAmount: number;
  rightLabel: string;
  rightAmount: number;
  gain: number;
  gainAbs: number;
  isCollected: boolean;
}

// Valor del filtro para las metas sin entidad (los ids de entidades empiezan en 1)
const NO_INSTITUTION = 0;

@Component({
  selector: 'app-savings-goals-list',
  templateUrl: './savings-goals-list.component.html',
  styleUrls: ['./savings-goals-list.component.css'],
  imports: [CommonModule, RouterModule, TranslateModule, ConfirmDialogComponent, SavingsMovementModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SavingsGoalsListComponent implements OnInit {
  @ViewChild(ConfirmDialogComponent) confirmDialog!: ConfirmDialogComponent;
  @ViewChild(SavingsMovementModalComponent) movementModal!: SavingsMovementModalComponent;
  private pendingCallback: ((result: ConfirmDialogResult) => void) | null = null;

  private router = inject(Router);
  private alertService = inject(AlertService);
  private formatterService = inject(FormatterHelperService);
  private translate = inject(TranslateService);

  private savingsStore = useSavingsStore();
  private currencyStore = useCurrencyStore();
  private financialInstitutionsStore = useFinancialInstitutionsStore();

  // Flag del store y no el loading global (otros pedidos lo apagan antes de tiempo)
  protected isLoading = this.savingsStore.needsLoadingGoals;
  protected filterStatus = signal<number | null>(GoalStatus.Active);
  protected filterProgressionType = signal<number | null>(null);
  protected filterInstitution = signal<number | null>(null);
  protected NO_INSTITUTION = NO_INSTITUTION;

  // Enums para el template
  protected GoalStatus = GoalStatus;
  protected GoalStatusLabels = GoalStatusLabels;
  protected GoalStatusIcons = GoalStatusIcons;
  protected GoalStatusColors = GoalStatusColors;
  protected ProgressionType = ProgressionType;
  protected ProgressionTypeLabels = ProgressionTypeLabels;
  protected ProgressionTypeIcons = ProgressionTypeIcons;
  // Todos los tipos del enum, así el filtro no queda desactualizado al agregar uno nuevo
  protected progressionTypes = Object.values(ProgressionType).filter((v): v is ProgressionType => typeof v === 'number');

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

    const institutionFilter = this.filterInstitution();
    if (institutionFilter !== null) {
      filtered = filtered.filter(g => (g.institutionId ?? NO_INSTITUTION) === institutionFilter);
    }

    return filtered;
  });

  // Solo las entidades que tienen alguna meta, ordenadas por nombre; "Sin entidad" al final
  protected institutionOptions = computed(() => {
    const institutions = this.financialInstitutionsStore.financialInstitutionsById();
    const ids = new Set(this.savingsStore.filteredGoals().map(g => g.institutionId ?? NO_INSTITUTION));
    const options = [...ids]
      .filter(id => id !== NO_INSTITUTION)
      .map(id => ({ id, name: institutions.get(id)?.name ?? '' }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return ids.has(NO_INSTITUTION) ? [...options, { id: NO_INSTITUTION, name: '' }] : options;
  });

  protected selectedInstitutionName = computed(() => {
    const id = this.filterInstitution();
    if (id === null) return null;
    return id === NO_INSTITUTION ? this.translate.instant('savingsGoals.noInstitution') : this.getFinancialInstitutionName(id);
  });

  // Total de lo ahorrado en las metas filtradas, por moneda: para compararlo con la barra de la entidad en el dashboard
  protected institutionTotals = computed(() => {
    if (this.filterInstitution() === null) return [];
    const totals = new Map<number, number>();
    this.goals().forEach(g => totals.set(g.currencyId, (totals.get(g.currencyId) ?? 0) + (g.currentAmount ?? 0)));
    return [...totals.entries()].map(([currencyId, total]) => ({ currencyId, total }));
  });

  ngOnInit(): void {
    this.savingsStore.reloadGoals();
    this.currencyStore.loadCurrencies();
    this.financialInstitutionsStore.loadFinancialInstitutions();
  }

  protected getFinancialInstitutionName(institutionId: number | null): string {
    if (!institutionId) return '';
    return this.financialInstitutionsStore.financialInstitutionsById().get(institutionId)?.name ?? '';
  }

  protected setStatusFilter(statusId: number | null): void {
    this.filterStatus.set(statusId);
  }

  protected setProgressionTypeFilter(typeId: number | null): void {
    this.filterProgressionType.set(typeId);
  }

  protected setInstitutionFilter(institutionId: number | null): void {
    this.filterInstitution.set(institutionId);
  }

  protected create(): void {
    this.router.navigate(['/savings/create']);
  }

  protected viewDetail(goal: any): void {
    this.router.navigate(['/savings', goal.id]);
  }

  // El modal de cobro vive en el detalle: se abre ahí directamente
  protected registerPayout(goal: any): void {
    this.router.navigate(['/savings', goal.id], { queryParams: { payout: 1 } });
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

  protected openMovementModal(goal: any, movementType: number): void {
    this.movementModal.open({
      goalId: goal.id,
      currencyId: goal.currencyId,
      currentAmount: goal.currentAmount,
      annualRatePercentage: goal.annualRatePercentage,
      startDate: goal.startDate,
      movementType,
      progressionTypeId: goal.progressionTypeId,
      targetAmount: goal.targetAmount,
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

  // Bloque "depósito → al vencimiento". Con el cobro registrado muestra lo cobrado y la ganancia real (cobrado − ahorrado)
  protected getMaturityBlock(goal: any): MaturityBlock | null {
    const isCollected = goal.statusId === GoalStatus.Withdrawn && goal.payoutAmount != null;
    let leftLabel: string;
    let leftAmount: number;
    let estimated: number;
    if (this.isDepositType(goal)) {
      leftLabel = 'savingsGoals.deposit';
      leftAmount = goal.baseAmount ?? goal.currentAmount;
      estimated = goal.targetAmount;
    } else if (goal.progressionTypeId === ProgressionType.Scheduled && goal.baseAmount && goal.numberOfInstallments) {
      // Cobrado: contra lo que realmente se depositó; si no, contra el total del cronograma
      leftLabel = isCollected ? 'savingsGoals.saved' : 'savingsGoals.totalDeposits';
      leftAmount = isCollected ? goal.currentAmount : goal.baseAmount * goal.numberOfInstallments;
      estimated = goal.targetAmount;
    } else if (isCollected) {
      leftLabel = 'savingsGoals.saved';
      leftAmount = goal.currentAmount;
      estimated = goal.payoutAmount;
    } else {
      return null;
    }
    const rightAmount = isCollected ? goal.payoutAmount : estimated;
    const gain = rightAmount - leftAmount;
    return {
      leftLabel,
      leftAmount,
      rightLabel: isCollected ? 'savingsGoals.collected' : 'savingsGoals.atMaturity',
      rightAmount,
      gain,
      gainAbs: Math.abs(gain),
      isCollected,
    };
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

  // Topeado en el plazo: un depósito vencido muestra "1 / 1 mes" y no "4 / 1 mes"
  protected getMonthsElapsed(dateStr: any, termMonths: number): number {
    const start = new Date(this.normalizeDate(String(dateStr)));
    const now = new Date();
    const elapsed = Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()));
    return Math.min(elapsed, termMonths);
  }

  private normalizeDate(s: string): string {
    return s.length > 10 && s.substring(10) === 'T00:00:00.000Z' ? s.substring(0, 10) + 'T00:00:00' : s;
  }
}