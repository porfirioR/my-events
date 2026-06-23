import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, tap, switchMap, catchError, of } from 'rxjs';
import { DashboardSummaryApiModel } from '../models/api/dashboard/dashboard-summary-api.model';
import { DashboardApiService } from '../services/api/dashboard-api.service';
import { useLoadingStore } from './loading.store';

export interface DashboardState {
  summary: DashboardSummaryApiModel | null;
  isLoaded: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  summary: null,
  isLoaded: false,
  error: null,
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
            loadingStore.setLoadingSuccess();
            return of(null);
          }
          return dashboardApiService.getSummary().pipe(
            tap(summary => {
              patchState(store, { summary, isLoaded: true });
              loadingStore.setLoadingSuccess();
            }),
            catchError(error => {
              patchState(store, { error: 'Failed to load dashboard summary' });
              loadingStore.setLoadingSuccess();
              throw new Error(error);
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
              loadingStore.setLoadingSuccess();
              throw new Error(error);
            })
          )
        )
      )
    ),
  }))
);

export const useDashboardStore = (): InstanceType<typeof DashboardStore> => {
  return inject(DashboardStore);
};