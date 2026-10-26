import { signalStore, withState, withMethods, patchState, withComputed } from '@ngrx/signals';
import { inject, computed } from '@angular/core';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, tap, switchMap, catchError, of } from 'rxjs';
import {
  FinancialInstitutionApiModel,
  CreateFinancialInstitutionApiRequest,
  UpdateFinancialInstitutionApiRequest,
} from '../models/api/financial-institutions';
import { FinancialInstitutionType } from '../models/enums';
import { FinancialInstitutionApiService } from '../services/api/financial-institution-api.service';
import { useLoadingStore } from './loading.store';

export interface FinancialInstitutionsState {
  financialInstitutions: FinancialInstitutionApiModel[];
  error: string | null;
  isFinancialInstitutionsLoaded: boolean;
}

const initialState: FinancialInstitutionsState = {
  financialInstitutions: [],
  error: null,
  isFinancialInstitutionsLoaded: false,
};

const typeOrder = [
  FinancialInstitutionType.Bank,
  FinancialInstitutionType.Cooperative,
  FinancialInstitutionType.Cash,
  FinancialInstitutionType.Person,
  FinancialInstitutionType.Other,
];

export const FinancialInstitutionsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),

  withComputed((store) => ({
    // Verificar si hay error
    hasError: computed(() => !!store.error()),

    financialInstitutionsById: computed(() =>
      new Map(store.financialInstitutions().map(f => [f.id, f]))
    ),

    // Agrupadas por tipo (Bank → Other) y ordenadas por nombre, para los selectores
    financialInstitutionsByType: computed(() => typeOrder
      .map(type => ({
        type,
        financialInstitutions: store.financialInstitutions()
          .filter(f => f.type === type)
          .sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .filter(group => group.financialInstitutions.length > 0)
    ),
  })),

  withMethods((store,
    financialInstitutionApiService = inject(FinancialInstitutionApiService),
    loadingStore = useLoadingStore(),
  ) => ({
    loadFinancialInstitutions: rxMethod<void>(
      pipe(
        switchMap(() => {
          if (store.isFinancialInstitutionsLoaded()) return of(null);
          return financialInstitutionApiService.getAll().pipe(
            tap(financialInstitutions => patchState(store, { financialInstitutions, isFinancialInstitutionsLoaded: true })),
            catchError(() => {
              patchState(store, { error: 'Failed to load financial institutions' });
              return of(null);
            }),
          );
        })
      )
    ),

    createFinancialInstitution: (request: CreateFinancialInstitutionApiRequest) => {
      loadingStore.setLoading();
      patchState(store, { error: null });
      return financialInstitutionApiService.create(request).pipe(
        tap(financialInstitution => {
          patchState(store, { financialInstitutions: [...store.financialInstitutions(), financialInstitution] });
          loadingStore.setLoadingSuccess();
        }),
        catchError(error => {
          patchState(store, { error: 'Failed to create financial institution' });
          loadingStore.setLoadingSuccess();
          throw error;
        }),
      );
    },

    updateFinancialInstitution: (id: number, request: UpdateFinancialInstitutionApiRequest) => {
      loadingStore.setLoading();
      patchState(store, { error: null });
      return financialInstitutionApiService.update(id, request).pipe(
        tap(financialInstitution => {
          patchState(store, {
            financialInstitutions: store.financialInstitutions().map(f => f.id === id ? financialInstitution : f),
          });
          loadingStore.setLoadingSuccess();
        }),
        catchError(error => {
          patchState(store, { error: 'Failed to update financial institution' });
          loadingStore.setLoadingSuccess();
          throw error;
        }),
      );
    },

    deleteFinancialInstitution: rxMethod<number>(
      pipe(
        tap(() => { loadingStore.setLoading(); }),
        switchMap(id => financialInstitutionApiService.delete(id).pipe(
          tap(() => {
            patchState(store, { financialInstitutions: store.financialInstitutions().filter(f => f.id !== id) });
            loadingStore.setLoadingSuccess();
          }),
          catchError(() => { patchState(store, { error: 'Failed to delete financial institution' }); loadingStore.setLoadingFailed(); return of(null); }),
        ))
      )
    ),

    clearAll: () => patchState(store, initialState),
  }))
);

export const useFinancialInstitutionsStore = (): InstanceType<typeof FinancialInstitutionsStore> => inject(FinancialInstitutionsStore);
