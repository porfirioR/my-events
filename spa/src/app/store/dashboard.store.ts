import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, tap, switchMap, catchError, of } from 'rxjs';
import { DashboardSummaryApiModel } from '../models/api/dashboard/dashboard-summary-api.model';
import { NetWorthSummaryApiModel } from '../models/api/dashboard/net-worth-summary-api.model';
import { DashboardApiService } from '../services/api/dashboard-api.service';
import { useLoadingStore } from './loading.store';

export interface DashboardState {
  summary: DashboardSummaryApiModel | null;
  isLoaded: boolean;
  error: string | null;
  netWorth: NetWorthSummaryApiModel | null;
  isNetWorthLoading: boolean;
  netWorthError: string | null;
}

const initialState: DashboardState = {
  summary: null,
  isLoaded: false,
  error: null,
  netWorth: null,
  isNetWorthLoading: false,
  netWorthError: null,
};

export const DashboardStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store,
    dashboardApiService = inject(DashboardApiService),
    loadingStore = useLoadingStore()
  ) => ({
    loadSummary: rxMethod<void>(
      pipe(
        tap(() => {
          if (store.isLoaded()) return;
          loadingStore.setLoading();
          patchState(store, { error: null });
        }),
        switchMap(() => {
          if (store.isLoaded()) {
            return of(null);
          }
          return dashboardApiService.getSummary().pipe(
            tap(summary => {
              patchState(store, { summary, isLoaded: true });
              loadingStore.setLoadingSuccess();
            }),
            catchError(error => {
              patchState(store, { error: 'Failed to load dashboard summary' });
              loadingStore.setLoadingFailed();
              return of(null);
            })
          );
        })
      )
    ),

    reloadSummary: rxMethod<void>(
      pipe(
        tap(() => {
          loadingStore.setLoading();
          patchState(store, { error: null, isLoaded: false });
        }),
        switchMap(() =>
          dashboardApiService.getSummary().pipe(
            tap(summary => {
              patchState(store, { summary, isLoaded: true });
              loadingStore.setLoadingSuccess();
            }),
            catchError(error => {
              patchState(store, { error: 'Failed to reload dashboard summary' });
              loadingStore.setLoadingFailed();
              return of(null);
            })
          )
        )
      )
    ),

    // Sin caché: los saldos cambian desde otros módulos (cuentas, ahorros, préstamos), así que se pide cada vez que se abre el dashboard.
    // Mientras carga se sigue mostrando el último patrimonio; no usa el loading global para no tapar la pantalla.
    loadNetWorth: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { isNetWorthLoading: true, netWorthError: null })),
        switchMap(() =>
          dashboardApiService.getNetWorth().pipe(
            tap(netWorth => patchState(store, { netWorth, isNetWorthLoading: false })),
            catchError(() => {
              patchState(store, { netWorthError: 'Failed to load net worth', isNetWorthLoading: false });
              return of(null);
            })
          )
        )
      )
    ),

    clearNetWorth: () => patchState(store, { netWorth: null, netWorthError: null }),
  }))
);

export const useDashboardStore = (): InstanceType<typeof DashboardStore> => {
  return inject(DashboardStore);
};