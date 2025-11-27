// src/app/store/savings.store.ts

import { signalStore, withState, withMethods, patchState, withComputed } from '@ngrx/signals';
import { inject, computed } from '@angular/core';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, tap, switchMap, catchError, throwError } from 'rxjs';
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

export interface SavingsState {
  goals: SavingsGoalApiModel[];
  selectedGoal: SavingsGoalApiModel | undefined;
  installments: SavingsInstallmentApiModel[];
  deposits: SavingsDepositApiModel[];
  error: string | null;
  filterStatus: number | null;
  filterProgressionType: number | null;
}

export const SavingsStore = signalStore(
  { providedIn: 'root' },
  withState<SavingsState>({
    goals: [],
    selectedGoal: undefined,
    installments: [],
    deposits: [],
    error: null,
    filterStatus: null,
    filterProgressionType: null
  }),
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
    )
  })),
  withMethods((store, savingsGoalApiService = inject(SavingsGoalApiService)) => ({
    // ==================== GOALS ====================

    loadGoals: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { error: null })),
        switchMap(() => savingsGoalApiService.getAll().pipe(
          tap(goals => patchState(store, { goals })),
          catchError(error => {
            patchState(store, { error: 'Failed to load savings goals' });
            return throwError(() => error);
          })
        ))
      )
    ),

    loadGoalById: rxMethod<number>(
      pipe(
        tap(() => patchState(store, { error: null })),
        switchMap((id) => savingsGoalApiService.getById(id).pipe(
          tap(goal => patchState(store, { selectedGoal: goal })),
          catchError(error => {
            patchState(store, { error: 'Failed to load savings goal' });
            return throwError(() => error);
          })
        ))
      )
    ),

    createGoal: (request: CreateSavingsGoalApiRequest) => {
      patchState(store, { error: null });
      return savingsGoalApiService.create(request).pipe(
        tap(goal => {
          const currentGoals = store.goals();
          patchState(store, {
            goals: [...currentGoals, goal],
            selectedGoal: goal
          });
        })
      );
    },

    updateGoal: (id: number, request: UpdateSavingsGoalApiRequest) => {
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
        })
      );
    },

    deleteGoal: rxMethod<number>(
      pipe(
        tap(() => patchState(store, { error: null })),
        switchMap((id) => savingsGoalApiService.delete(id).pipe(
          tap(() => {
            const updatedGoals = store.goals().filter(g => g.id !== id);
            patchState(store, {
              goals: updatedGoals,
              selectedGoal: undefined
            });
          }),
          catchError(error => {
            patchState(store, { error: 'Failed to delete savings goal' });
            return throwError(() => error);
          })
        ))
      )
    ),

    // ==================== INSTALLMENTS ====================

    loadInstallments: rxMethod<number>(
      pipe(
        tap(() => patchState(store, { error: null })),
        switchMap((goalId) => savingsGoalApiService.getInstallmentsByGoalId(goalId).pipe(
          tap(installments => patchState(store, { installments })),
          catchError(error => {
            patchState(store, { error: 'Failed to load installments' });
            return throwError(() => error);
          })
        ))
      )
    ),

    payInstallment: (goalId: number, installmentId: number, request: PayInstallmentApiRequest) => {
      patchState(store, { error: null });
      return savingsGoalApiService.payInstallment(goalId, installmentId, request).pipe(
        tap((deposit) => {
          // Actualizar la cuota en el estado
          const updatedInstallments = store.installments().map(i =>
            i.id === installmentId ? { ...i, statusId: 2, paidDate: new Date() } : i
          );
          
          // Agregar el depósito
          const currentDeposits = store.deposits();
          
          // Actualizar el goal (refrescar desde el servidor)
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
        })
      );
    },

    skipInstallment: rxMethod<{ goalId: number; installmentId: number }>(
      pipe(
        tap(() => patchState(store, { error: null })),
        switchMap(({ goalId, installmentId }) =>
          savingsGoalApiService.skipInstallment(goalId, installmentId).pipe(
            tap(updatedInstallment => {
              const updatedInstallments = store.installments().map(i =>
                i.id === installmentId ? updatedInstallment : i
              );
              patchState(store, { installments: updatedInstallments });
            }),
            catchError(error => {
              patchState(store, { error: 'Failed to skip installment' });
              return throwError(() => error);
            })
          )
        )
      )
    ),

    addInstallments: (goalId: number, request: AddInstallmentsApiRequest) => {
      patchState(store, { error: null });
      return savingsGoalApiService.addInstallments(goalId, request).pipe(
        tap(newInstallments => {
          const currentInstallments = store.installments();
          patchState(store, {
            installments: [...currentInstallments, ...newInstallments]
          });
        })
      );
    },

    // ==================== DEPOSITS ====================

    loadDeposits: rxMethod<number>(
      pipe(
        tap(() => patchState(store, { error: null })),
        switchMap((goalId) => savingsGoalApiService.getDepositsByGoalId(goalId).pipe(
          tap(deposits => patchState(store, { deposits })),
          catchError(error => {
            patchState(store, { error: 'Failed to load deposits' });
            return throwError(() => error);
          })
        ))
      )
    ),

    createFreeFormDeposit: (goalId: number, request: CreateFreeFormDepositApiRequest) => {
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
        })
      );
    },

    deleteDeposit: rxMethod<number>(
      pipe(
        tap(() => patchState(store, { error: null })),
        switchMap((depositId) => savingsGoalApiService.deleteDeposit(depositId).pipe(
          tap(() => {
            const updatedDeposits = store.deposits().filter(d => d.id !== depositId);
            patchState(store, { deposits: updatedDeposits });
          }),
          catchError(error => {
            patchState(store, { error: 'Failed to delete deposit' });
            return throwError(() => error);
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
        deposits: []
      }),

    clearError: () =>
      patchState(store, { error: null }),

    clearAll: () =>
      patchState(store, {
        goals: [],
        selectedGoal: undefined,
        installments: [],
        deposits: [],
        error: null,
        filterStatus: null,
        filterProgressionType: null
      })
  }))
);

export const useSavingsStore = (): InstanceType<typeof SavingsStore> => {
  return inject(SavingsStore);
};