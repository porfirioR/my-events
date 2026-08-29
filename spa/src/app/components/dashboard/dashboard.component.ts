import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { useDashboardStore } from '../../store';
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

  protected formatCurrency = this.formatterService.formatCurrency;
}
