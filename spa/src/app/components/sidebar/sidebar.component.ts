import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { filter } from 'rxjs';
import { LayoutService } from '../../services';

interface SidebarItem {
  route: string;
  label: string;
  icon: string;
  exact: boolean;
}

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
  imports: [RouterModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  protected layoutService = inject(LayoutService);

  protected isCollapsed = this.layoutService.isSidebarCollapsed;
  protected isMobileOpen = this.layoutService.isMobileSidebarOpen;

  protected items: SidebarItem[] = [
    { route: '/', label: 'common.dashboard', icon: 'fa-gauge-high', exact: true },
    { route: '/collaborators', label: 'common.collaborators', icon: 'fa-users', exact: false },
    { route: '/transactions', label: 'common.transactions', icon: 'fa-dollar-sign', exact: false },
    { route: '/savings', label: 'common.savingsGoals', icon: 'fa-piggy-bank', exact: false },
    { route: '/loans', label: 'common.loans', icon: 'fa-hand-holding-dollar', exact: false },
    { route: '/travels', label: 'common.travels', icon: 'fa-suitcase-rolling', exact: false },
  ];

  constructor() {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.layoutService.closeMobileSidebar());
  }
}
