import { signalStore, withState, withMethods, patchState, withComputed } from '@ngrx/signals';
import { inject, computed } from '@angular/core';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, tap, switchMap, catchError, of } from 'rxjs';
import {
  LoanApiModel,
  LoanInstallmentApiModel,
  LoanPaymentApiModel,
  LoanEntityTermApiModel,
  PayLoanInstallmentApiRequest,
} from '../models/api/loans';
import { LoanApiService } from '../services/api/loan-api.service';
import { useLoadingStore } from './loading.store';

export interface LoansState {
  loans: LoanApiModel[];
  selectedLoan: LoanApiModel | undefined;
  installments: LoanInstallmentApiModel[];
  payments: LoanPaymentApiModel[];
  entityTerms: LoanEntityTermApiModel[];
  error: string | null;
  isLoansLoaded: boolean;
  isEntityTermsLoaded: boolean;
}

const initialState: LoansState = {
  loans: [],
  selectedLoan: undefined,
  installments: [],
  payments: [],
  entityTerms: [],
  error: null,
  isLoansLoaded: false,
  isEntityTermsLoaded: false,
};

export const LoansStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),

  withComputed((store) => ({
    activeLoans: computed(() => store.loans().filter(l => l.statusId === 1)),
    completedLoans: computed(() => store.loans().filter(l => l.statusId === 2)),
    sortedLoans: computed(() =>
      [...store.loans()].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
    ),
    pendingInstallments: computed(() => store.installments().filter(i => i.statusId === 1)),
    paidInstallments: computed(() => store.installments().filter(i => i.statusId === 2)),
    nextInstallment: computed(() => store.installments().filter(i => i.statusId === 1)[0] ?? null),
    selectedLoanProgress: computed(() => {
      const loan = store.selectedLoan();
      if (!loan || loan.actualTotalAmount === 0) return 0;
      return Math.min(Math.round((loan.totalPaid / loan.actualTotalAmount) * 100), 100);
    }),
    selectedLoanRemaining: computed(() => {
      const loan = store.selectedLoan();
      if (!loan) return 0;
      return Math.max(loan.currentBalance, 0);
    }),
    entityTermsByEntity: computed(() => {
      const map = new Map<number, LoanEntityTermApiModel[]>();
      for (const t of store.entityTerms()) {
        const arr = map.get(t.loanEntityId) ?? [];
        arr.push(t);
        map.set(t.loanEntityId, arr);
      }
      return map;
    }),
  })),

  withMethods((store,
    loanApiService = inject(LoanApiService),
    loadingStore = useLoadingStore(),
  ) => ({
    loadEntityTerms: rxMethod<void>(
      pipe(
        switchMap(() => {
          if (store.isEntityTermsLoaded()) return of(null);
          return loanApiService.getEntityTerms().pipe(
            tap(terms => patchState(store, { entityTerms: terms, isEntityTermsLoaded: true })),
            catchError(() => of(null)),
          );
        })
      )
    ),

    reloadLoans: rxMethod<void>(
      pipe(
        tap(() => {
          loadingStore.setLoading();
          patchState(store, { error: null, isLoansLoaded: false });
        }),
        switchMap(() => loanApiService.getAll().pipe(
          tap(loans => {
            patchState(store, { loans, isLoansLoaded: true });
            loadingStore.setLoadingSuccess();
          }),
          catchError(error => {
            patchState(store, { error: 'Failed to load loans' });
            loadingStore.setLoadingSuccess();
            throw new Error(error);
          }),
        ))
      )
    ),

    loadLoanById: rxMethod<number>(
      pipe(
        tap(() => {
          loadingStore.setLoading();
          patchState(store, { error: null });
        }),
        switchMap(id => loanApiService.getById(id).pipe(
          tap(loan => {
            const updatedLoans = store.loans().map(l => l.id === loan.id ? loan : l);
            patchState(store, { selectedLoan: loan, loans: updatedLoans });
            loadingStore.setLoadingSuccess();
          }),
          catchError(error => {
            patchState(store, { error: 'Failed to load loan' });
            loadingStore.setLoadingSuccess();
            throw new Error(error);
          }),
        ))
      )
    ),

    loadInstallments: rxMethod<number>(
      pipe(
        tap(() => {
          loadingStore.setLoading();
          patchState(store, { error: null });
        }),
        switchMap(loanId => loanApiService.getInstallments(loanId).pipe(
          tap(installments => {
            patchState(store, { installments });
            loadingStore.setLoadingSuccess();
          }),
          catchError(error => {
            patchState(store, { error: 'Failed to load installments' });
            loadingStore.setLoadingSuccess();
            throw new Error(error);
          }),
        ))
      )
    ),

    loadPayments: rxMethod<number>(
      pipe(
        tap(() => { loadingStore.setLoading(); }),
        switchMap(loanId => loanApiService.getPayments(loanId).pipe(
          tap(payments => {
            patchState(store, { payments });
            loadingStore.setLoadingSuccess();
          }),
          catchError(() => { loadingStore.setLoadingSuccess(); return of([]); }),
        ))
      )
    ),

    createLoan: (request: import('../models/api/loans').CreateLoanApiRequest) => {
      loadingStore.setLoading();
      patchState(store, { error: null });
      return loanApiService.create(request).pipe(
        tap(loan => {
          patchState(store, { loans: [...store.loans(), loan], selectedLoan: loan });
          loadingStore.setLoadingSuccess();
        }),
        catchError(error => {
          patchState(store, { error: 'Failed to create loan' });
          loadingStore.setLoadingSuccess();
          throw new Error(error);
        }),
      );
    },

    updateLoan: (id: number, request: import('../models/api/loans').UpdateLoanApiRequest) => {
      loadingStore.setLoading();
      patchState(store, { error: null });
      return loanApiService.update(id, request).pipe(
        tap(loan => {
          patchState(store, {
            loans: store.loans().map(l => l.id === id ? loan : l),
            selectedLoan: loan,
          });
          loadingStore.setLoadingSuccess();
        }),
        catchError(error => {
          patchState(store, { error: 'Failed to update loan' });
          loadingStore.setLoadingSuccess();
          throw new Error(error);
        }),
      );
    },

    deleteLoan: rxMethod<number>(
      pipe(
        tap(() => { loadingStore.setLoading(); }),
        switchMap(id => loanApiService.delete(id).pipe(
          tap(() => {
            patchState(store, { loans: store.loans().filter(l => l.id !== id), selectedLoan: undefined });
            loadingStore.setLoadingSuccess();
          }),
          catchError(error => { loadingStore.setLoadingSuccess(); throw new Error(error); }),
        ))
      )
    ),

    payInstallment: (loanId: number, installmentId: number, request: PayLoanInstallmentApiRequest) => {
      loadingStore.setLoading();
      patchState(store, { error: null });
      return loanApiService.payInstallment(loanId, installmentId, request).pipe(
        tap(payment => {
          const updatedInstallments = store.installments().map(i =>
            i.id === installmentId ? { ...i, statusId: 2, paidDate: new Date().toISOString(), paidAmount: request.amount } : i
          );
          const loan = store.selectedLoan();
          if (loan) {
            const paidInst = updatedInstallments.find(i => i.id === installmentId);
            const newTotalPaid = loan.totalPaid + request.amount;
            const newBalance = Math.max(loan.currentBalance - (paidInst?.principalAmount ?? 0), 0);
            const updatedLoan = { ...loan, totalPaid: newTotalPaid, currentBalance: newBalance };
            patchState(store, {
              installments: updatedInstallments,
              payments: [payment, ...store.payments()],
              selectedLoan: updatedLoan,
              loans: store.loans().map(l => l.id === loanId ? updatedLoan : l),
            });
          }
          loadingStore.setLoadingSuccess();
        }),
        catchError(error => {
          patchState(store, { error: 'Failed to pay installment' });
          loadingStore.setLoadingSuccess();
          throw new Error(error);
        }),
      );
    },

    skipInstallment: rxMethod<{ loanId: number; installmentId: number }>(
      pipe(
        tap(() => { loadingStore.setLoading(); }),
        switchMap(({ loanId, installmentId }) => loanApiService.skipInstallment(loanId, installmentId).pipe(
          tap(updated => {
            patchState(store, {
              installments: store.installments().map(i => i.id === installmentId ? updated : i),
            });
            loadingStore.setLoadingSuccess();
          }),
          catchError(error => { loadingStore.setLoadingSuccess(); throw new Error(error); }),
        ))
      )
    ),

    clearSelectedLoan: () => patchState(store, {
      selectedLoan: undefined,
      installments: [],
      payments: [],
    }),

    clearAll: () => patchState(store, initialState),
  }))
);

export const useLoansStore = (): InstanceType<typeof LoansStore> => inject(LoansStore);
