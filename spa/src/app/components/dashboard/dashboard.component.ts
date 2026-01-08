import { Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import {
  useCollaboratorStore,
  useSavingsStore,
  useTransactionStore,
  useTravelStore,
} from '../../store';
import { FormatterHelperService } from '../../services';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  imports: [
    RouterModule,
    TranslateModule
  ],
})
export class DashboardComponent {
  private collaboratorStore = useCollaboratorStore();
  private transactionStore = useTransactionStore();
  private savingsStore = useSavingsStore();
  private travelStore = useTravelStore();
  private formatterService = inject(FormatterHelperService);

  unsettledTransactions = this.transactionStore.unsettledTransactions;
  myCreatedTransactions = this.transactionStore.myCreatedTransactions;
  settledTransactions = this.transactionStore.settledTransactions;

  protected totalCollaborators = this.collaboratorStore.totalCount;
  protected activeCollaborators = this.collaboratorStore.activeCollaborators;
  protected inactiveCollaborators = this.collaboratorStore.inactiveCollaborators;

  protected savingsStats = computed(() => {
    const goals = this.savingsStore.goals();
    return {
      total: goals.length,
      active: goals.filter(x => x.statusId === 1).length,
      completed: goals.filter(x => x.statusId === 2).length,
      paused: goals.filter(x => x.statusId === 3).length,
      cancelled: goals.filter(x => x.statusId === 4).length,
    };
  });

  protected travelStats = computed(() => {
    const travels = this.travelStore.travels();
    return {
      total: travels.length,
      active: travels.filter(x => x.status === 'Active').length,
      finalized: travels.filter(x => x.status === 'Finalized').length,
    };
  });

  // Savings Goals - Active Goals (top 3)
  protected activeGoals = computed(() => {
    return this.savingsStore
      .goals()
      .filter(x => x.statusId === 1)
      .sort(
        (a, b) => new Date(b.dateUpdated).getTime() - new Date(a.dateUpdated).getTime()
      )
      .slice(0, 3);
  });

  // Helper Methods
  protected calculateProgress(goal: any): number {
    if (goal.targetAmount === 0) return 0;
    return Math.min(
      Math.round((goal.currentAmount / goal.targetAmount) * 100),
      100
    );
  }

  protected formatCurrency = this.formatterService.formatCurrency;
}