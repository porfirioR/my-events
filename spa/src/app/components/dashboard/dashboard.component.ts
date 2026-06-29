import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { useDashboardStore } from '../../store';
import { ActiveGoalSummaryApiModel } from '../../models/api/dashboard/dashboard-summary-api.model';
import { FormatterHelperService } from '../../services';
import { ProgressionType } from '../../models/enums';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  imports: [
    RouterModule,
    TranslateModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private dashboardStore = useDashboardStore();
  private formatterService = inject(FormatterHelperService);

  private summary = this.dashboardStore.summary;

  protected totalCollaborators = computed(() => this.summary()?.collaborators.total ?? 0);
  protected activeCollaborators = computed(() => this.summary()?.collaborators.active ?? 0);
  protected inactiveCollaborators = computed(() => this.summary()?.collaborators.inactive ?? 0);

  protected totalTransactions = computed(() => this.summary()?.transactions.total ?? 0);
  protected unsettledTransactions = computed(() => this.summary()?.transactions.unsettled ?? 0);
  protected settledTransactions = computed(() => this.summary()?.transactions.settled ?? 0);

  protected savingsStats = computed(() => ({
    total: this.summary()?.savingsGoals.total ?? 0,
    active: this.summary()?.savingsGoals.active ?? 0,
    completed: this.summary()?.savingsGoals.completed ?? 0,
  }));

  protected travelStats = computed(() => ({
    total: this.summary()?.travels.total ?? 0,
    active: this.summary()?.travels.active ?? 0,
    finalized: this.summary()?.travels.finalized ?? 0,
  }));

  protected loansStats = computed(() => ({
    total: this.summary()?.loans.total ?? 0,
    active: this.summary()?.loans.active ?? 0,
    completed: this.summary()?.loans.completed ?? 0,
  }));

  protected activeGoals = computed(() => this.summary()?.savingsGoals.topActive ?? []);

  protected calculateProgress(goal: ActiveGoalSummaryApiModel): number {
    const isLumpSum = goal.progressionTypeId === ProgressionType.FixedDeposit || goal.progressionTypeId === ProgressionType.CDA;
    const base = isLumpSum
      ? (goal.baseAmount ?? goal.targetAmount)
      : goal.progressionTypeId === ProgressionType.Scheduled && goal.baseAmount && goal.numberOfInstallments
        ? goal.baseAmount * goal.numberOfInstallments
        : goal.targetAmount;
    if (base === 0) return 0;
    return Math.min(Math.round((goal.currentAmount / base) * 100), 100);
  }

  protected formatCurrency = this.formatterService.formatCurrency;
}
