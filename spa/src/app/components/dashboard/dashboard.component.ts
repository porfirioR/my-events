import { Component, computed, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  useCollaboratorStore,
  useSavingsStore,
  useTransactionStore,
} from '../../store';
import { FormatterHelperService } from '../../services';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  imports: [RouterModule],
})
export class DashboardComponent implements OnInit {
  private collaboratorStore = useCollaboratorStore();
  private transactionStore = useTransactionStore();
  private savingsStore = useSavingsStore();

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
      active: goals.filter((x) => x.statusId === 1).length,
      completed: goals.filter((x) => x.statusId === 2).length,
      paused: goals.filter((x) => x.statusId === 3).length,
      cancelled: goals.filter((x) => x.statusId === 4).length,
    };
  });

  // Savings Goals - Active Goals (top 3)
  protected activeGoals = computed(() => {
    return this.savingsStore
      .goals()
      .filter((g) => g.statusId === 1)
      .sort(
        (a, b) =>
          new Date(b.dateUpdated).getTime() - new Date(a.dateUpdated).getTime()
      )
      .slice(0, 3);
  });

  // Savings Goals - Total Saved
  protected totalSaved = computed(() => {
    return this.savingsStore
      .goals()
      .reduce((sum, goal) => sum + goal.currentAmount, 0);
  });

  ngOnInit(): void {
    // Load Collaborators
    if (this.collaboratorStore.totalCount() === 0) {
      this.collaboratorStore.loadCollaborators();
    }

    // Load Transactions
    this.transactionStore.loadTransactions();

    // Load Savings Goals
    this.savingsStore.loadGoals();
  }

  // Helper Methods
  protected calculateProgress(goal: any): number {
    if (goal.targetAmount === 0) return 0;
    return Math.min(
      Math.round((goal.currentAmount / goal.targetAmount) * 100),
      100
    );
  }

  protected formatCurrency = FormatterHelperService.formatCurrency;
}
