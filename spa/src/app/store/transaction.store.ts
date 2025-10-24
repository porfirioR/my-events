import { signalStore, withState, withMethods, patchState, withComputed } from '@ngrx/signals';
import { inject, computed } from '@angular/core';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, tap, switchMap, catchError, throwError } from 'rxjs';
import {
  TransactionViewApiModel,
  BalanceApiModel,
  CreateTransactionApiRequest,
  AddReimbursementApiRequest,
  TransactionApiModel,
} from '../models/api/transactions';
import { TransactionApiService } from '../services/api/transaction-api.service';

export interface TransactionState {
  transactions: TransactionViewApiModel[];
  balances: BalanceApiModel[];
  selectedTransaction: TransactionApiModel | undefined;
  selectedBalance: BalanceApiModel | undefined;
  error: string | null;
  filter: string;
}

export const TransactionStore = signalStore(
  { providedIn: 'root' },
  withState<TransactionState>({
    transactions: [],
    balances: [],
    selectedTransaction: undefined,
    selectedBalance: undefined,
    error: null,
    filter: ''
  }),
  withComputed((store) => ({
    // Transacciones que creé yo
    myCreatedTransactions: computed(() =>
      store.transactions().filter(x => x.createdByMe)
    ),

    // Transacciones del colaborador matcheado
    theirCreatedTransactions: computed(() =>
      store.transactions().filter(x => !x.createdByMe)
    ),

    // Transacciones donde yo pagué
    transactionsIPaid: computed(() =>
      store.transactions().filter(x => x.iPaid > 0)
    ),

    // Transacciones donde el colaborador pagó
    transactionsTheyPaid: computed(() =>
      store.transactions().filter(x => x.theyPaid > 0)
    ),

    // Transacciones no liquidadas
    unsettledTransactions: computed(() =>
      store.transactions().filter(x => !x.isSettled)
    ),

    // Transacciones liquidadas
    settledTransactions: computed(() =>
      store.transactions().filter(x => x.isSettled)
    ),

    // Transacciones filtradas por descripción
    filteredTransactions: computed(() => {
      const filter = store.filter().toLowerCase();
      if (!filter) return store.transactions();
      return store.transactions().filter(x =>
        x.description?.toLowerCase().includes(filter) ||
        `${x.myCollaborator.name} ${x.myCollaborator.surname}`.toLowerCase().includes(filter)
      );
    }),

    // Balance total (suma de todos los balances)
    totalBalance: computed(() => {
      return store.balances().reduce((sum, x) => sum + x.netBalance, 0);
    }),

    // Cuánto me deben en total
    totalTheyOwe: computed(() => {
      return store.balances()
        .filter(x => x.netBalance > 0)
        .reduce((sum, x) => sum + x.collaboratorOwes, 0);
    }),

    // Cuánto debo en total
    totalIOwe: computed(() => {
      return store.balances()
        .filter(x => x.netBalance < 0)
        .reduce((sum, x) => sum + x.userOwes, 0);
    }),

    // Total de transacciones
    totalCount: computed(() => store.transactions().length),
  })),
  withMethods((store, transactionApiService = inject(TransactionApiService)) => ({
    // Cargar todas mis transacciones
    loadTransactions: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { error: null })),
        switchMap(() => transactionApiService.getMyTransactions().pipe(
          tap(transactions => patchState(store, { transactions })),
          catchError(error => {
            patchState(store, { error: 'Failed to load transactions' });
            return throwError(() => error);
          })
        ))
      )
    ),

    // Cargar transacción por ID
    loadTransactionById: rxMethod<number>(
      pipe(
        tap(() => patchState(store, { error: null })),
        switchMap((id) => transactionApiService.getById(id).pipe(
          tap(transaction => {
            patchState(store, { selectedTransaction: transaction });
          }),
          catchError(error => {
            patchState(store, { error: 'Failed to load transaction' });
            return throwError(() => error);
          })
        ))
      )
    ),

    // Crear transacción
    createTransaction: (request: CreateTransactionApiRequest) => {
      patchState(store, { error: null });
      return transactionApiService.createTransaction(request).pipe(
        tap(() => {
          // Recargar transacciones después de crear
          // En la práctica, deberías agregar la nueva transacción al estado
          // pero como devuelve TransactionApiModel y no TransactionViewApiModel,
          // es más fácil recargar todo
        })
      );
    },

    // Agregar reintegro
    addReimbursement: rxMethod<{ transactionId: number; request: AddReimbursementApiRequest }>(
      pipe(
        tap(() => patchState(store, { error: null })),
        switchMap(({ transactionId, request }) => 
          transactionApiService.addReimbursement(transactionId, request).pipe(
            switchMap(() => transactionApiService.getMyTransactions().pipe(
              tap(transactions => patchState(store, { transactions }))
            )
          ),
            catchError(error => {
              patchState(store, { error: 'Failed to add reimbursement' });
              return throwError(() => error);
            })
          )
        )
      )
    ),

    // Cargar todos los balances
    loadBalances: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { error: null })),
        switchMap(() => transactionApiService.getAllBalances().pipe(
          tap(balances => patchState(store, { balances })),
          catchError(error => {
            patchState(store, { error: 'Failed to load balances' });
            return throwError(() => error);
          })
        ))
      )
    ),

    // Cargar balance con un colaborador específico
    loadBalanceWithCollaborator: rxMethod<number>(
      pipe(
        tap(() => patchState(store, { error: null })),
        switchMap((collaboratorId) => transactionApiService.getBalanceWithCollaborator(collaboratorId).pipe(
          tap(balance => patchState(store, { selectedBalance: balance })),
          catchError(error => {
            patchState(store, { error: 'Failed to load balance' });
            return throwError(() => error);
          })
        ))
      )
    ),

    // Eliminar transacción
    deleteTransaction: rxMethod<number>(
      pipe(
        tap(() => patchState(store, { error: null })),
        switchMap((id) => transactionApiService.deleteTransaction(id).pipe(
          tap(() => {
            const updatedTransactions = store.transactions().filter(x => x.id !== id);
            patchState(store, { transactions: updatedTransactions });
          }),
          catchError(error => {
            patchState(store, { error: 'Failed to delete transaction' });
            return throwError(() => error);
          })
        ))
      )
    ),

    // settleTransaction transacción
    settleTransaction: rxMethod<number>(
      pipe(
        tap(() => patchState(store, { error: null })),
        switchMap((id) => transactionApiService.settleTransaction(id).pipe(
          tap(() => {
            const transactions = store.transactions()
            const index = transactions.findIndex(x => x.id === id)
            transactions.at(index)!.isSettled = true;
            patchState(store, { transactions: transactions });
          }),
          catchError(error => {
            patchState(store, { error: 'Failed to settle transaction' });
            return throwError(() => error);
          })
        ))
      )
    ),

    // Métodos auxiliares
    setFilter: (filter: string) => patchState(store, { filter }),
    clearFilter: () => patchState(store, { filter: '' }),
    selectTransaction: (transaction: TransactionApiModel | undefined) =>
      patchState(store, { selectedTransaction: transaction }),
    selectBalance: (balance: BalanceApiModel | undefined) =>
      patchState(store, { selectedBalance: balance }),
    clearError: () => patchState(store, { error: null }),
    clearSelectedTransaction: () => patchState(store, { selectedTransaction: undefined }),
    clearTransactions: () => patchState(store, {
      transactions: [],
      balances: [],
      selectedTransaction: undefined,
      selectedBalance: undefined,
      error: null,
      filter: ''
    }),
    clearSelectedBalance: () => patchState(store, { selectedBalance: undefined }),
  }))
);

export const useTransactionStore = (): InstanceType<typeof TransactionStore> => {
  return inject(TransactionStore);
};