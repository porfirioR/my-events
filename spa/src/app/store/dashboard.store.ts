import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, tap, switchMap, catchError, of } from 'rxjs';
import { DashboardSummaryApiModel } from '../models/api/dashboard/dashboard-summary-api.model';
import { NetWorthSummaryApiModel } from '../models/api/dashboard/net-worth-summary-api.model';
import { MaturityCalendarApiModel } from '../models/api/dashboard/maturity-calendar-api.model';
import { DebtsOverviewApiModel } from '../models/api/dashboard/debts-overview-api.model';
import { FinancialHealthApiModel, FinancialSettingsApiModel, UpsertFinancialSettingsApiRequest } from '../models/api/dashboard/financial-health-api.model';
import { DashboardApiService } from '../services/api/dashboard-api.service';
import { useLoadingStore } from './loading.store';

export interface DashboardState {
  summary: DashboardSummaryApiModel | null;
  isLoaded: boolean;
  error: string | null;
  netWorth: NetWorthSummaryApiModel | null;
  isNetWorthLoading: boolean;
  netWorthError: string | null;
  maturities: MaturityCalendarApiModel | null;
  isMaturitiesLoading: boolean;
  maturitiesError: string | null;
  debts: DebtsOverviewApiModel | null;
  isDebtsLoading: boolean;
  debtsError: string | null;
  health: FinancialHealthApiModel | null;
  isHealthLoading: boolean;
  healthError: string | null;
  financialSettings: FinancialSettingsApiModel | null;
}

const initialState: DashboardState = {
  summary: null,
  isLoaded: false,
  error: null,
  netWorth: null,
  isNetWorthLoading: false,
  netWorthError: null,
  maturities: null,
  isMaturitiesLoading: false,
  maturitiesError: null,
  debts: null,
  isDebtsLoading: false,
  debtsError: null,
  health: null,
  isHealthLoading: false,
  healthError: null,
  financialSettings: null,
};

// Fecha local 'YYYY-MM-DD' (no toISOString: de noche en Paraguay ya sería mañana en UTC)
const localToday = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
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

    // Igual que el patrimonio: sin caché y sin loading global (se muestra el último dato mientras se actualiza)
    loadMaturities: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { isMaturitiesLoading: true, maturitiesError: null })),
        switchMap(() =>
          dashboardApiService.getMaturities(localToday()).pipe(
            tap(maturities => patchState(store, { maturities, isMaturitiesLoading: false })),
            catchError(() => {
              patchState(store, { maturitiesError: 'Failed to load maturities', isMaturitiesLoading: false });
              return of(null);
            })
          )
        )
      )
    ),

    loadDebts: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { isDebtsLoading: true, debtsError: null })),
        switchMap(() =>
          dashboardApiService.getDebts(localToday()).pipe(
            tap(debts => patchState(store, { debts, isDebtsLoading: false })),
            catchError(() => {
              patchState(store, { debtsError: 'Failed to load debts', isDebtsLoading: false });
              return of(null);
            })
          )
        )
      )
    ),

    // Igual que el patrimonio: sin caché y sin loading global
    loadHealth: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { isHealthLoading: true, healthError: null })),
        switchMap(() =>
          dashboardApiService.getHealth(localToday()).pipe(
            tap(health => patchState(store, { health, isHealthLoading: false })),
            catchError(() => {
              patchState(store, { healthError: 'Failed to load financial health', isHealthLoading: false });
              return of(null);
            })
          )
        )
      )
    ),

    // Parámetros del usuario para los indicadores (si no los cargó, vienen los umbrales por defecto)
    loadFinancialSettings: () => {
      loadingStore.setLoading();
      return dashboardApiService.getFinancialSettings().pipe(
        tap(financialSettings => {
          patchState(store, { financialSettings });
          loadingStore.setLoadingSuccess();
        }),
        catchError(error => {
          loadingStore.setLoadingSuccess();
          throw error;
        }),
      );
    },

    saveFinancialSettings: (request: UpsertFinancialSettingsApiRequest) => {
      loadingStore.setLoading();
      return dashboardApiService.upsertFinancialSettings(request).pipe(
        tap(financialSettings => {
          // Los indicadores cambian con los nuevos parámetros: se vuelven a pedir al abrir el dashboard
          patchState(store, { financialSettings, health: null });
          loadingStore.setLoadingSuccess();
        }),
        catchError(error => {
          loadingStore.setLoadingSuccess();
          throw error;
        }),
      );
    },

    clearFinancialData: () => patchState(store, { netWorth: null, netWorthError: null, maturities: null, maturitiesError: null, debts: null, debtsError: null, health: null, healthError: null, financialSettings: null }),
  }))
);

export const useDashboardStore = (): InstanceType<typeof DashboardStore> => {
  return inject(DashboardStore);
};