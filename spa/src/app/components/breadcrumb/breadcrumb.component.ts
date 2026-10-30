import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Route, Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { filter, map } from 'rxjs';
import { BreadcrumbService } from '../../services';

interface BreadcrumbItem {
  label: string;
  // Clave de traducción (true) o texto ya resuelto, como el nombre de un préstamo (false)
  translate: boolean;
  url: string | null;
}

// Traducción de cada segmento conocido de la URL
const SEGMENT_LABELS: Record<string, string> = {
  collaborators: 'common.collaborators',
  transactions: 'common.transactions',
  savings: 'common.savingsGoals',
  loans: 'common.loans',
  travels: 'common.travels',
  balances: 'dashboard.balances',
  create: 'common.new',
  new: 'common.new',
  edit: 'common.edit',
  'match-requests': 'matchRequests.title',
  invitations: 'common.invitations',
  operations: 'travels.operations',
};

@Component({
  selector: 'app-breadcrumb',
  templateUrl: './breadcrumb.component.html',
  imports: [RouterModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreadcrumbComponent {
  private router = inject(Router);
  private breadcrumbService = inject(BreadcrumbService);

  private url = toSignal(
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  // Rutas reales de la app como listas de segmentos (ej. ['loans', ':id', 'edit'])
  private routePatterns = this.flattenRoutes(this.router.config);

  protected items = computed<BreadcrumbItem[]>(() => {
    const segments = this.url().split(/[?#]/)[0].split('/').filter(Boolean);
    const labels = this.breadcrumbService.labels();
    const items: BreadcrumbItem[] = [];

    segments.forEach((segment, index) => {
      const url = '/' + segments.slice(0, index + 1).join('/');
      const isLast = index === segments.length - 1;
      const isRoute = this.isRoute(segments.slice(0, index + 1));
      const knownLabel = labels[url];

      // Los tramos intermedios que no son ruta (ej. /travels/5/operations) no aportan nada
      if (!isLast && !isRoute && !knownLabel) return;

      if (knownLabel) {
        items.push({ label: knownLabel, translate: false, url: isLast ? null : url });
      } else if (SEGMENT_LABELS[segment]) {
        items.push({ label: SEGMENT_LABELS[segment], translate: true, url: isLast || !isRoute ? null : url });
      } else if (isLast && segments[index - 1] === 'edit') {
        // /collaborators/edit/5 → "Editar"
        items.push({ label: 'common.edit', translate: true, url: null });
      } else {
        items.push({ label: `#${segment}`, translate: false, url: isLast || !isRoute ? null : url });
      }
    });
    return items;
  });

  private isRoute = (segments: string[]): boolean =>
    this.routePatterns.some(pattern =>
      pattern.length === segments.length && pattern.every((part, i) => part.startsWith(':') || part === segments[i]));

  private flattenRoutes(routes: Route[], parent: string[] = []): string[][] {
    return routes.flatMap(route => {
      const path = [...parent, ...(route.path ? route.path.split('/') : [])];
      const own = route.component || route.loadComponent ? [path] : [];
      return [...own, ...(route.children ? this.flattenRoutes(route.children, path) : [])];
    });
  }
}
