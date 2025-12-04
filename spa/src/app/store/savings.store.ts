// src/app/store/savings.store.ts

import { signalStore, withState, withMethods, patchState, withComputed } from '@ngrx/signals';
import { inject, computed } from '@angular/core';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, tap, switchMap, catchError, of } from 'rxjs';
import {
  SavingsGoalApiModel,
  SavingsInstallmentApiModel,
  SavingsDepositApiModel,
  CreateSavingsGoalApiRequest,
  UpdateSavingsGoalApiRequest,
  PayInstallmentApiRequest,
  CreateFreeFormDepositApiRequest,
  AddInstallmentsApiRequest
} from '../models/api/savings';
import { GoalStatus } from '../models/enums';
import { SavingsGoalApiService } from '../services';
import { useLoadingStore } from './loading.store';

export interface SavingsState {
  goals: SavingsGoalApiModel[];
  selectedGoal: SavingsGoalApiModel | undefined;
  installments: SavingsInstallmentApiModel[];
  deposits: SavingsDepositApiModel[];
  error: string | null;
  filterStatus: number | null;
  filterProgressionType: number | null;
  isGoalsLoaded: boolean;
  isInstallmentsLoaded: boolean;
  isDepositsLoaded: boolean;
}

const initialState: SavingsState = {
  goals: [],
  selectedGoal: undefined,
  installments: [],
  deposits: [],
  error: null,
  filterStatus: null,
  filterProgressionType: null,
  isGoalsLoaded: false,
  isInstallmentsLoaded: false,
  isDepositsLoaded: false
};

export const SavingsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  
  withComputed((store) => ({
    // Objetivos activos
    activeGoals: computed(() =>
      store.goals().filter(g => g.statusId === GoalStatus.Active)
    ),

    // Objetivos completados
    completedGoals: computed(() =>
      store.goals().filter(g => g.statusId === GoalStatus.Completed)
    ),

    // Objetivos filtrados
    filteredGoals: computed(() => {
      let filtered = store.goals();

      const statusFilter = store.filterStatus();
      if (statusFilter !== null) {
        filtered = filtered.filter(g => g.statusId === statusFilter);
      }

      const typeFilter = store.filterProgressionType();
      if (typeFilter !== null) {
        filtered = filtered.filter(g => g.progressionTypeId === typeFilter);
      }

      return filtered;
    }),

    // Total de objetivos
    totalGoals: computed(() => store.goals().length),

    // Cuotas pendientes del objetivo seleccionado
    pendingInstallments: computed(() =>
      store.installments().filter(i => i.statusId === 1) // Pending
    ),

    // Cuotas pagadas del objetivo seleccionado
    paidInstallments: computed(() =>
      store.installments().filter(i => i.statusId === 2) // Paid
    ),

    // Progreso del objetivo seleccionado (porcentaje)
    selectedGoalProgress: computed(() => {
      const goal = store.selectedGoal();
      if (!goal) return 0;
      if (goal.targetAmount === 0) return 0;
      return Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100);
    }),

    // Monto restante del objetivo seleccionado
    selectedGoalRemaining: computed(() => {
      const goal = store.selectedGoal();
      if (!goal) return 0;
      return Math.max(goal.targetAmount - goal.currentAmount, 0);
    }),

    // Depósitos del objetivo seleccionado ordenados por fecha
    sortedDeposits: computed(() =>
      [...store.deposits()].sort((a, b) =>
        new Date(b.depositDate).getTime() - new Date(a.depositDate).getTime()
      )
    ),
    
    // Verificar si hay error
    hasError: computed(() => !!store.error()),
    
    // Verificar si necesita cargar
    needsLoadingGoals: computed(() => !store.isGoalsLoaded() && !store.error()),
    needsLoadingInstallments: computed(() => !store.isInstallmentsLoaded() && !store.error()),
    needsLoadingDeposits: computed(() => !store.isDepositsLoaded() && !store.error())
  })),
  
  withMethods((store, 
    savingsGoalApiService = inject(SavingsGoalApiService),
    loadingStore = useLoadingStore()
  ) => ({
    // ==================== GOALS ====================

    loadGoals: rxMethod<void>(
      pipe(
        tap(() => {
          if (store.isGoalsLoaded()) return;
          loadingStore.setLoading();
          patchState(store, { error: null });
        }),
        switchMap(() => {
          if (store.isGoalsLoaded()) {
            loadingStore.setLoadingSuccess();
            return of(null);
          }

          return savingsGoalApiService.getAll().pipe(
            tap(goals => {
              patchState(store, { 
                goals,
                isGoalsLoaded: true 
              });
              loadingStore.setLoadingSuccess();
            }),
            catchError(error => {
              patchState(store, { error: 'Failed to load savings goals' });
              console.error('Goals loading error:', error);
              throw new Error(error);
            })
          );
        })
      )
    ),

    reloadGoals: rxMethod<void>(
      pipe(
        tap(() => {
          loadingStore.setLoading();
          patchState(store, { error: null, isGoalsLoaded: false });
        }),
        switchMap(() => savingsGoalApiService.getAll().pipe(
          tap(goals => {
            patchState(store, { 
              goals,
              isGoalsLoaded: true 
            });
            loadingStore.setLoadingSuccess();
          }),
          catchError(error => {
            patchState(store, { error: 'Failed to reload savings goals' });
            console.error('Goals reload error:', error);
            throw new Error(error);
          })
        ))
      )
    ),

    loadGoalById: rxMethod<number>(
      pipe(
        tap(() => {
          loadingStore.setLoading();
          patchState(store, { error: null });
        }),
        switchMap((id) => savingsGoalApiService.getById(id).pipe(
          tap(goal => {
            patchState(store, { selectedGoal: goal });
            loadingStore.setLoadingSuccess();
          }),
          catchError(error => {
            patchState(store, { error: 'Failed to load savings goal' });
            console.error('Load goal by ID error:', error);
            throw new Error(error);
          })
        ))
      )
    ),

    createGoal: (request: CreateSavingsGoalApiRequest) => {
      loadingStore.setLoading();
      patchState(store, { error: null });
      
      return savingsGoalApiService.create(request).pipe(
        tap(goal => {
          const currentGoals = store.goals();
          patchState(store, {
            goals: [...currentGoals, goal],
            selectedGoal: goal
          });
          loadingStore.setLoadingSuccess();
        }),
        catchError(error => {
          patchState(store, { error: 'Failed to create savings goal' });
          console.error('Create goal error:', error);
          throw new Error(error);
        })
      );
    },

    updateGoal: (id: number, request: UpdateSavingsGoalApiRequest) => {
      loadingStore.setLoading();
      patchState(store, { error: null });
      
      return savingsGoalApiService.update(id, request).pipe(
        tap(updatedGoal => {
          const updatedGoals = store.goals().map(g =>
            g.id === id ? updatedGoal : g
          );
          patchState(store, {
            goals: updatedGoals,
            selectedGoal: updatedGoal
          });
          loadingStore.setLoadingSuccess();
        }),
        catchError(error => {
          patchState(store, { error: 'Failed to update savings goal' });
          console.error('Update goal error:', error);
          throw new Error(error);
        })
      );
    },

    deleteGoal: rxMethod<number>(
      pipe(
        tap(() => {
          loadingStore.setLoading();
          patchState(store, { error: null });
        }),
        switchMap((id) => savingsGoalApiService.delete(id).pipe(
          tap(() => {
            const updatedGoals = store.goals().filter(g => g.id !== id);
            patchState(store, {
              goals: updatedGoals,
              selectedGoal: undefined
            });
            loadingStore.setLoadingSuccess();
          }),
          catchError(error => {
            patchState(store, { error: 'Failed to delete savings goal' });
            console.error('Delete goal error:', error);
            throw new Error(error);
          })
        ))
      )
    ),

    // ==================== INSTALLMENTS ====================

    loadInstallments: rxMethod<number>(
      pipe(
        tap(() => {
          loadingStore.setLoading();
          patchState(store, { error: null });
        }),
        switchMap((goalId) => savingsGoalApiService.getInstallmentsByGoalId(goalId).pipe(
          tap(installments => {
            patchState(store, { 
              installments,
              isInstallmentsLoaded: true 
            });
            loadingStore.setLoadingSuccess();
          }),
          catchError(error => {
            patchState(store, { error: 'Failed to load installments' });
            console.error('Load installments error:', error);
            throw new Error(error);
          })
        ))
      )
    ),

    payInstallment: (goalId: number, installmentId: number, request: PayInstallmentApiRequest) => {
      loadingStore.setLoading();
      patchState(store, { error: null });
      
      return savingsGoalApiService.payInstallment(goalId, installmentId, request).pipe(
        tap((deposit) => {
          // Actualizar la cuota en el estado
          const updatedInstallments = store.installments().map(i =>
            i.id === installmentId ? { ...i, statusId: 2, paidDate: new Date() } : i
          );
          
          // Agregar el depósito
          const currentDeposits = store.deposits();
          
          // Actualizar el goal
          const currentGoal = store.selectedGoal();
          if (currentGoal) {
            const updatedGoal = {
              ...currentGoal,
              currentAmount: currentGoal.currentAmount + request.amount
            };
            
            patchState(store, {
              installments: updatedInstallments,
              deposits: [...currentDeposits, deposit],
              selectedGoal: updatedGoal
            });
          }
          loadingStore.setLoadingSuccess();
        }),
        catchError(error => {
          patchState(store, { error: 'Failed to pay installment' });
          console.error('Pay installment error:', error);
          throw new Error(error);
        })
      );
    },

    skipInstallment: rxMethod<{ goalId: number; installmentId: number }>(
      pipe(
        tap(() => {
          loadingStore.setLoading();
          patchState(store, { error: null });
        }),
        switchMap(({ goalId, installmentId }) =>
          savingsGoalApiService.skipInstallment(goalId, installmentId).pipe(
            tap(updatedInstallment => {
              const updatedInstallments = store.installments().map(i =>
                i.id === installmentId ? updatedInstallment : i
              );
              patchState(store, { installments: updatedInstallments });
              loadingStore.setLoadingSuccess();
            }),
            catchError(error => {
              patchState(store, { error: 'Failed to skip installment' });
              console.error('Skip installment error:', error);
              throw new Error(error);
            })
          )
        )
      )
    ),

    addInstallments: (goalId: number, request: AddInstallmentsApiRequest) => {
      loadingStore.setLoading();
      patchState(store, { error: null });
      
      return savingsGoalApiService.addInstallments(goalId, request).pipe(
        tap(newInstallments => {
          const currentInstallments = store.installments();
          patchState(store, {
            installments: [...currentInstallments, ...newInstallments]
          });
          loadingStore.setLoadingSuccess();
        }),
        catchError(error => {
          patchState(store, { error: 'Failed to add installments' });
          console.error('Add installments error:', error);
          throw new Error(error);
        })
      );
    },

    // ==================== DEPOSITS ====================

    loadDeposits: rxMethod<number>(
      pipe(
        tap(() => {
          loadingStore.setLoading();
          patchState(store, { error: null });
        }),
        switchMap((goalId) => savingsGoalApiService.getDepositsByGoalId(goalId).pipe(
          tap(deposits => {
            patchState(store, { 
              deposits,
              isDepositsLoaded: true 
            });
            loadingStore.setLoadingSuccess();
          }),
          catchError(error => {
            patchState(store, { error: 'Failed to load deposits' });
            console.error('Load deposits error:', error);
            throw new Error(error);
          })
        ))
      )
    ),

    createFreeFormDeposit: (goalId: number, request: CreateFreeFormDepositApiRequest) => {
      loadingStore.setLoading();
      patchState(store, { error: null });
      
      return savingsGoalApiService.createFreeFormDeposit(goalId, request).pipe(
        tap(deposit => {
          const currentDeposits = store.deposits();
          const currentGoal = store.selectedGoal();
          
          if (currentGoal) {
            const updatedGoal = {
              ...currentGoal,
              currentAmount: currentGoal.currentAmount + request.amount
            };
            
            patchState(store, {
              deposits: [...currentDeposits, deposit],
              selectedGoal: updatedGoal
            });
          }
          loadingStore.setLoadingSuccess();
        }),
        catchError(error => {
          patchState(store, { error: 'Failed to create deposit' });
          console.error('Create deposit error:', error);
          throw new Error(error);
        })
      );
    },

    deleteDeposit: rxMethod<number>(
      pipe(
        tap(() => {
          loadingStore.setLoading();
          patchState(store, { error: null });
        }),
        switchMap((depositId) => savingsGoalApiService.deleteDeposit(depositId).pipe(
          tap(() => {
            const updatedDeposits = store.deposits().filter(d => d.id !== depositId);
            patchState(store, { deposits: updatedDeposits });
            loadingStore.setLoadingSuccess();
          }),
          catchError(error => {
            patchState(store, { error: 'Failed to delete deposit' });
            console.error('Delete deposit error:', error);
            throw new Error(error);
          })
        ))
      )
    ),

    // ==================== FILTERS ====================

    setStatusFilter: (statusId: number | null) =>
      patchState(store, { filterStatus: statusId }),

    setProgressionTypeFilter: (progressionTypeId: number | null) =>
      patchState(store, { filterProgressionType: progressionTypeId }),

    clearFilters: () =>
      patchState(store, { filterStatus: null, filterProgressionType: null }),

    // ==================== UTILITY ====================

    selectGoal: (goal: SavingsGoalApiModel | undefined) =>
      patchState(store, { selectedGoal: goal }),

    clearSelectedGoal: () =>
      patchState(store, {
        selectedGoal: undefined,
        installments: [],
        deposits: [],
        isInstallmentsLoaded: false,
        isDepositsLoaded: false
      }),

    clearError: () =>
      patchState(store, { error: null }),

    clearAll: () =>
      patchState(store, initialState)
  }))
);

export const useSavingsStore = (): InstanceType<typeof SavingsStore> => {
  return inject(SavingsStore);
};