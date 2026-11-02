import { signalStore, withState, withMethods, patchState, withComputed } from '@ngrx/signals';
import { inject, computed } from '@angular/core';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, tap, switchMap, catchError, of } from 'rxjs';
import {
  AccountApiModel,
  AccountBalanceSnapshotApiModel,
  CreateAccountApiRequest,
  UpdateAccountApiRequest,
  UpsertAccountBalancesApiRequest,
} from '../models/api/accounts';
import { AccountApiService } from '../services/api/account-api.service';
import { useLoadingStore } from './loading.store';

export interface AccountsState {
  accounts: AccountApiModel[];
  balances: AccountBalanceSnapshotApiModel[];
  error: string | null;
  isAccountsLoaded: boolean;
}

const initialState: AccountsState = {
  accounts: [],
  balances: [],
  error: null,
  isAccountsLoaded: false,
};

export const AccountsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),

  withComputed((store) => ({
    // Verificar si hay error
    hasError: computed(() => !!store.error()),

    // Flag del store y no el loading global (otros pedidos lo apagan antes de tiempo)
    needsLoadingAccounts: computed(() => !store.isAccountsLoaded() && !store.error()),

    accountsById: computed(() =>
      new Map(store.accounts().map(a => [a.id, a]))
    ),

    // Solo las activas, ordenadas por nombre (las que se cargan cada mes)
    activeAccounts: computed(() => store.accounts()
      .filter(a => a.isActive)
      .sort((a, b) => a.name.localeCompare(b.name))
    ),
  })),

  withMethods((store,
    accountApiService = inject(AccountApiService),
    loadingStore = useLoadingStore(),
  ) => ({
    loadAccounts: rxMethod<void>(
      pipe(
        switchMap(() => {
          if (store.isAccountsLoaded()) return of(null);
          return accountApiService.getAll().pipe(
            tap(accounts => patchState(store, { accounts, isAccountsLoaded: true })),
            catchError(() => {
              patchState(store, { error: 'Failed to load accounts' });
              return of(null);
            }),
          );
        })
      )
    ),

    // Siempre va a la api: el saldo actual cambia al cargar los saldos del mes
    reloadAccounts: rxMethod<void>(
      pipe(
        switchMap(() => accountApiService.getAll().pipe(
          tap(accounts => patchState(store, { accounts, isAccountsLoaded: true, error: null })),
          catchError(() => {
            patchState(store, { error: 'Failed to load accounts' });
            return of(null);
          }),
        ))
      )
    ),

    createAccount: (request: CreateAccountApiRequest) => {
      loadingStore.setLoading();
      patchState(store, { error: null });
      return accountApiService.create(request).pipe(
        tap(account => {
          patchState(store, { accounts: [...store.accounts(), account] });
          loadingStore.setLoadingSuccess();
        }),
        catchError(error => {
          patchState(store, { error: 'Failed to create account' });
          loadingStore.setLoadingSuccess();
          throw error;
        }),
      );
    },

    updateAccount: (id: number, request: UpdateAccountApiRequest) => {
      loadingStore.setLoading();
      patchState(store, { error: null });
      return accountApiService.update(id, request).pipe(
        tap(account => {
          patchState(store, { accounts: store.accounts().map(a => a.id === id ? account : a) });
          loadingStore.setLoadingSuccess();
        }),
        catchError(error => {
          patchState(store, { error: 'Failed to update account' });
          loadingStore.setLoadingSuccess();
          throw error;
        }),
      );
    },

    deleteAccount: rxMethod<number>(
      pipe(
        tap(() => { loadingStore.setLoading(); }),
        switchMap(id => accountApiService.delete(id).pipe(
          tap(() => {
            patchState(store, {
              accounts: store.accounts().filter(a => a.id !== id),
              balances: store.balances().filter(b => b.accountId !== id),
            });
            loadingStore.setLoadingSuccess();
          }),
          catchError(() => { patchState(store, { error: 'Failed to delete account' }); loadingStore.setLoadingFailed(); return of(null); }),
        ))
      )
    ),

    // ==================== BALANCE SNAPSHOTS ====================

    // from/to: 'YYYY-MM' (opcionales)
    loadBalances: rxMethod<{ from?: string; to?: string }>(
      pipe(
        switchMap(({ from, to }) => accountApiService.getBalances(from, to).pipe(
          tap(balances => patchState(store, { balances })),
          catchError(() => {
            patchState(store, { error: 'Failed to load balances' });
            return of(null);
          }),
        ))
      )
    ),

    // Carga (o actualiza) los saldos de un mes; si el mes es el último de la cuenta, pasa a ser su saldo actual
    upsertBalances: (request: UpsertAccountBalancesApiRequest) => {
      loadingStore.setLoading();
      patchState(store, { error: null });
      return accountApiService.upsertBalances(request).pipe(
        tap(snapshots => {
          const savedKeys = new Set(snapshots.map(s => `${s.accountId}|${s.snapshotDate}`));
          const latestByAccount = new Map(snapshots.map(s => [s.accountId, s]));
          patchState(store, {
            balances: [...store.balances().filter(b => !savedKeys.has(`${b.accountId}|${b.snapshotDate}`)), ...snapshots],
            accounts: store.accounts().map(account => {
              const snapshot = latestByAccount.get(account.id);
              if (!snapshot || (account.lastSnapshotDate && account.lastSnapshotDate > snapshot.snapshotDate)) return account;
              return { ...account, currentBalance: snapshot.balance, lastSnapshotDate: snapshot.snapshotDate };
            }),
          });
          loadingStore.setLoadingSuccess();
        }),
        catchError(error => {
          patchState(store, { error: 'Failed to save balances' });
          loadingStore.setLoadingSuccess();
          throw error;
        }),
      );
    },

    clearAll: () => patchState(store, initialState),
  }))
);

export const useAccountsStore = (): InstanceType<typeof AccountsStore> => inject(AccountsStore);
