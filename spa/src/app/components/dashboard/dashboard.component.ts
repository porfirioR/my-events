import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { useDashboardStore } from '../../store';

interface DashboardStat {
  value: number;
  label: string;
}

interface DashboardModuleCard {
  route: string;
  title: string;
  icon: string;
  iconClass: string;
  primaryBarClass: string;
  secondaryBarClass: string;
  total: number;
  primary: DashboardStat;
  secondary: DashboardStat;
}

interface DashboardQuickAction {
  route: string;
  label: string;
  icon: string;
  iconClass: string;
}

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

  private summary = this.dashboardStore.summary;

  protected isLoaded = computed(() => !!this.summary());

  // Las clases van literales para que Tailwind las detecte al compilar
  protected modules = computed<DashboardModuleCard[]>(() => {
    const summary = this.summary();
    return [
      {
        route: 'collaborators',
        title: 'dashboard.collaborators',
        icon: 'fa-users',
        iconClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
        primaryBarClass: 'bg-blue-500',
        secondaryBarClass: 'bg-blue-500/30',
        total: summary?.collaborators.total ?? 0,
        primary: { value: summary?.collaborators.active ?? 0, label: 'dashboard.active' },
        secondary: { value: summary?.collaborators.inactive ?? 0, label: 'dashboard.inactive' },
      },
      {
        route: 'transactions',
        title: 'dashboard.transactions',
        icon: 'fa-dollar-sign',
        iconClass: 'bg-green-500/15 text-green-600 dark:text-green-400',
        primaryBarClass: 'bg-green-500',
        secondaryBarClass: 'bg-green-500/30',
        total: summary?.transactions.total ?? 0,
        primary: { value: summary?.transactions.unsettled ?? 0, label: 'dashboard.unsettled' },
        secondary: { value: summary?.transactions.settled ?? 0, label: 'dashboard.settled' },
      },
      {
        route: 'savings',
        title: 'dashboard.savingsGoals',
        icon: 'fa-piggy-bank',
        iconClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
        primaryBarClass: 'bg-emerald-500',
        secondaryBarClass: 'bg-emerald-500/30',
        total: summary?.savingsGoals.total ?? 0,
        primary: { value: summary?.savingsGoals.active ?? 0, label: 'dashboard.active' },
        secondary: { value: summary?.savingsGoals.completed ?? 0, label: 'dashboard.completed' },
      },
      {
        route: 'loans',
        title: 'dashboard.loans',
        icon: 'fa-hand-holding-dollar',
        iconClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
        primaryBarClass: 'bg-amber-500',
        secondaryBarClass: 'bg-amber-500/30',
        total: summary?.loans.total ?? 0,
        primary: { value: summary?.loans.active ?? 0, label: 'dashboard.active' },
        secondary: { value: summary?.loans.completed ?? 0, label: 'dashboard.paidOff' },
      },
      {
        route: 'travels',
        title: 'dashboard.travels',
        icon: 'fa-suitcase-rolling',
        iconClass: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
        primaryBarClass: 'bg-orange-500',
        secondaryBarClass: 'bg-orange-500/30',
        total: summary?.travels.total ?? 0,
        primary: { value: summary?.travels.active ?? 0, label: 'dashboard.active' },
        secondary: { value: summary?.travels.finalized ?? 0, label: 'dashboard.finalized' },
      },
    ];
  });

  protected quickActions: DashboardQuickAction[] = [
    { route: 'collaborators/create', label: 'dashboard.addCollaborator', icon: 'fa-user-plus', iconClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
    { route: 'transactions/new', label: 'dashboard.addTransaction', icon: 'fa-dollar-sign', iconClass: 'bg-green-500/15 text-green-600 dark:text-green-400' },
    { route: 'savings/create', label: 'dashboard.newSavingsGoal', icon: 'fa-piggy-bank', iconClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
    { route: 'loans/create', label: 'dashboard.newLoan', icon: 'fa-hand-holding-dollar', iconClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
    { route: 'travels/create', label: 'dashboard.newTravel', icon: 'fa-suitcase-rolling', iconClass: 'bg-orange-500/15 text-orange-600 dark:text-orange-400' },
    { route: 'transactions/balances', label: 'dashboard.balances', icon: 'fa-balance-scale', iconClass: 'bg-accent/15 text-accent' },
  ];

  protected getShare = (value: number, total: number): number =>
    total > 0 ? Math.min((value / total) * 100, 100) : 0;
}
