import { signalStore, withState, withMethods, patchState, withComputed } from '@ngrx/signals';
import { inject, computed } from '@angular/core';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, tap, switchMap, catchError, of } from 'rxjs';
import {
  TransactionViewApiModel,
  BalanceApiModel,
  CreateTransactionApiRequest,
  AddReimbursementApiRequest,
  TransactionApiModel,
  TransactionDetailApiModel,
} from '../models/api/transactions';
import { TransactionApiService } from '../services/api/transaction-api.service';
import { useLoadingStore } from '.';

export interface TransactionState {
  transactions: TransactionViewApiModel[];
  balances: BalanceApiModel[];
  selectedTransaction: TransactionApiModel | undefined;
  selectedTransactionDetails: TransactionDetailApiModel | undefined;
  selectedBalance: BalanceApiModel | undefined;
  error: string | null;
  filter: string;
  isTransactionsLoaded: boolean;
  isBalancesLoaded: boolean;
}

const initialState: TransactionState = {
  transactions: [],
  balances: [],
  selectedTransaction: undefined,
  selectedBalance: undefined,
  selectedTransactionDetails: undefined,
  error: null,
  filter: '',
  isTransactionsLoaded: false,
  isBalancesLoaded: false
};

export const TransactionStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),

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

    // ✅ CORREGIDO: Cuánto me deben en total (suma de TODOS los collaboratorOwes)
    totalTheyOwe: computed(() => {
      return store.balances()
        .reduce((sum, x) => sum + x.collaboratorOwes, 0);
    }),

    // ✅ CORREGIDO: Cuánto debo en total (suma de TODOS los userOwes)
    totalIOwe: computed(() => {
      return store.balances()
        .reduce((sum, x) => sum + x.userOwes, 0);
    }),

    // Total de transacciones
    totalCount: computed(() => store.transactions().length),

    // Verificar si hay error
    hasError: computed(() => !!store.error()),

    // Verificar si necesita cargar transacciones
    needsLoadingTransactions: computed(() => !store.isTransactionsLoaded() && !store.error()),

    // Verificar si necesita cargar balances
    needsLoadingBalances: computed(() => !store.isBalancesLoaded() && !store.error())
  })),

  withMethods((store, 
    transactionApiService = inject(TransactionApiService),
    loadingStore = useLoadingStore()
  ) => ({
    // Cargar todas mis transacciones si no están cargadas
    loadTransactions: rxMethod<void>(
      pipe(
        tap(() => {
          if (store.isTransactionsLoaded()) return;
          loadingStore.setLoading();
          patchState(store, { error: null });
        }),
        switchMap(() => {
          if (store.isTransactionsLoaded()) {
            loadingStore.setLoadingSuccess();
            return of(null);
          }
          
          return transactionApiService.getMyTransactions().pipe(
            tap(transactions => {
              patchState(store, { 
                transactions, 
                isTransactionsLoaded: true 
              });
              loadingStore.setLoadingSuccess();
            }),
            catchError(error => {
              patchState(store, { error: 'Failed to load transactions' });
              loadingStore.setLoadingFailed();
              console.error('Transaction loading error:', error);
              throw new Error(error);
            })
          );
        })
      )
    ),

    // Forzar recarga de transacciones
    reloadTransactions: rxMethod<void>(
      pipe(
        tap(() => {
          loadingStore.setLoading();
          patchState(store, { error: null, isTransactionsLoaded: false });
        }),
        switchMap(() => transactionApiService.getMyTransactions().pipe(
          tap(transactions => {
            patchState(store, { 
              transactions, 
              isTransactionsLoaded: true 
            });
            loadingStore.setLoadingSuccess();
          }),
          catchError(error => {
            patchState(store, { error: 'Failed to reload transactions' });
            loadingStore.setLoadingFailed();
            console.error('Transaction reload error:', error);
            throw new Error(error);
          })
        ))
      )
    ),

    // Cargar transacción por ID
    loadTransactionById: rxMethod<number>(
      pipe(
        tap(() => {
          loadingStore.setLoading();
          patchState(store, { error: null });
        }),
        switchMap((id) => transactionApiService.getById(id).pipe(
          tap(transaction => {
            patchState(store, { selectedTransaction: transaction });
            loadingStore.setLoadingSuccess();
          }),
          catchError(error => {
            patchState(store, { error: 'Failed to load transaction' });
            loadingStore.setLoadingFailed();
            console.error('Load transaction by ID error:', error);
            throw new Error(error);
          })
        ))
      )
    ),

    // Crear transacción
    createTransaction: (request: CreateTransactionApiRequest) => {
      loadingStore.setLoading();
      patchState(store, { error: null });
      return transactionApiService.createTransaction(request).pipe(
        switchMap(() => transactionApiService.getMyTransactions().pipe(
          tap(transactions => {
            patchState(store, { 
              transactions,
              isTransactionsLoaded: true 
            });
            loadingStore.setLoadingSuccess();
          })
        )),
        catchError(error => {
          patchState(store, { error: 'Failed to create transaction' });
          loadingStore.setLoadingFailed();
          console.error('Create transaction error:', error);
          throw new Error(error);
        })
      );
    },

    // Agregar reintegro
    addReimbursement: rxMethod<{ transactionId: number; request: AddReimbursementApiRequest }>(
      pipe(
        tap(() => {
          loadingStore.setLoading();
          patchState(store, { error: null });
        }),
        switchMap(({ transactionId, request }) => 
          transactionApiService.addReimbursement(transactionId, request).pipe(
            switchMap(() => transactionApiService.getMyTransactions().pipe(
              tap(transactions => {
                patchState(store, { 
                  transactions,
                  isTransactionsLoaded: true 
                });
                loadingStore.setLoadingSuccess();
              })
            )),
            catchError(error => {
              patchState(store, { error: 'Failed to add reimbursement' });
              loadingStore.setLoadingFailed();
              console.error('Add reimbursement error:', error);
              throw new Error(error);
            })
          )
        )
      )
    ),

    // Cargar todos los balances si no están cargados
    loadBalances: rxMethod<void>(
      pipe(
        tap(() => {
          if (store.isBalancesLoaded()) return;
          loadingStore.setLoading();
          patchState(store, { error: null });
        }),
        switchMap(() => {
          if (store.isBalancesLoaded()) {
            loadingStore.setLoadingSuccess();
            return of(null);
          }

          return transactionApiService.getAllBalances().pipe(
            tap(balances => {
              patchState(store, { 
                balances,
                isBalancesLoaded: true 
              });
              loadingStore.setLoadingSuccess();
            }),
            catchError(error => {
              patchState(store, { error: 'Failed to load balances' });
              loadingStore.setLoadingFailed();
              console.error('Balance loading error:', error);
              throw new Error(error);
            })
          );
        })
      )
    ),

    // Forzar recarga de balances
    reloadBalances: rxMethod<void>(
      pipe(
        tap(() => {
          loadingStore.setLoading();
          patchState(store, { error: null, isBalancesLoaded: false });
        }),
        switchMap(() => transactionApiService.getAllBalances().pipe(
          tap(balances => {
            patchState(store, { 
              balances,
              isBalancesLoaded: true 
            });
            loadingStore.setLoadingSuccess();
          }),
          catchError(error => {
            patchState(store, { error: 'Failed to reload balances' });
            loadingStore.setLoadingFailed();
            console.error('Balance reload error:', error);
            throw new Error(error);
          })
        ))
      )
    ),

    // Cargar balance con un colaborador específico
    loadBalanceWithCollaborator: rxMethod<number>(
      pipe(
        tap(() => {
          loadingStore.setLoading();
          patchState(store, { error: null });
        }),
        switchMap((collaboratorId) => transactionApiService.getBalanceWithCollaborator(collaboratorId).pipe(
          tap(balance => {
            patchState(store, { selectedBalance: balance });
            loadingStore.setLoadingSuccess();
          }),
          catchError(error => {
            patchState(store, { error: 'Failed to load balance' });
            loadingStore.setLoadingFailed();
            console.error('Load balance with collaborator error:', error);
            throw new Error(error);
          })
        ))
      )
    ),

    // Eliminar transacción
    deleteTransaction: rxMethod<number>(
      pipe(
        tap(() => {
          loadingStore.setLoading();
          patchState(store, { error: null });
        }),
        switchMap((id) => transactionApiService.deleteTransaction(id).pipe(
          tap(() => {
            const updatedTransactions = store.transactions().filter(x => x.id !== id);
            patchState(store, { transactions: updatedTransactions });
            loadingStore.setLoadingSuccess();
          }),
          catchError(error => {
            patchState(store, { error: 'Failed to delete transaction' });
            loadingStore.setLoadingFailed();
            console.error('Delete transaction error:', error);
            throw new Error(error);
          })
        ))
      )
    ),

    // Liquidar transacción
    settleTransaction: rxMethod<number>(
      pipe(
        tap(() => {
          loadingStore.setLoading();
          patchState(store, { error: null });
        }),
        switchMap((id) => transactionApiService.settleTransaction(id).pipe(
          tap(() => {
            const transactions = [...store.transactions()];
            const index = transactions.findIndex(x => x.id === id);
            if (index !== -1) {
              transactions[index] = { ...transactions[index], isSettled: true };
              patchState(store, { transactions });
            }
            loadingStore.setLoadingSuccess();
          }),
          catchError(error => {
            patchState(store, { error: 'Failed to settle transaction' });
            loadingStore.setLoadingFailed();
            console.error('Settle transaction error:', error);
            throw new Error(error);
          })
        ))
      )
    ),
    
    // Cargar detalles de transacción
    loadTransactionDetails: rxMethod<number>(
      pipe(
        tap(() => {
          loadingStore.setLoading();
          patchState(store, { error: null });
        }),
        switchMap((id) => transactionApiService.getTransactionDetails(id).pipe(
          tap(details => {
            patchState(store, { selectedTransactionDetails: details });
            loadingStore.setLoadingSuccess();
          }),
          catchError(error => {
            patchState(store, { error: 'Failed to load transaction details' });
            loadingStore.setLoadingFailed();
            console.error('Load transaction details error:', error);
            throw new Error(error);
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
    clearTransactions: () => patchState(store, initialState),
    clearSelectedBalance: () => patchState(store, { selectedBalance: undefined }),
    clearSelectedTransactionDetails: () => patchState(store, { selectedTransactionDetails: undefined }),
  }))
);

export const useTransactionStore = (): InstanceType<typeof TransactionStore> => {
  return inject(TransactionStore);
};