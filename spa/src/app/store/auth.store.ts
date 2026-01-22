import { signalStore, withState, withMethods, patchState, withComputed } from '@ngrx/signals';
import { inject, computed } from '@angular/core';
import { useCurrencyStore } from './currency.store';
import { useCollaboratorStore, useSavingsStore, useTransactionStore, useTravelStore } from '.';

export interface AuthState {
  userId: number | null;
  email: string | null;
  name: string | null;
  surname: string | null;
  token: string | null;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  loginLoading: boolean;
  error: string | null;
}

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState<AuthState>({
    userId: null,
    email: null,
    name: null,
    surname: null,
    token: null,
    isAuthenticated: false,
    isEmailVerified: false,
    loginLoading: false,
    error: null
  }),
  withComputed((store) => ({
    isLoggedIn: computed(() => store.isAuthenticated() && !!store.token()),
    currentUser: computed(() => store.userId()),
    currentUserName: computed(() => `${store.name()} ${store.surname()}`),
    currentUserEmail: computed(() => store.email()),
    needsEmailVerification: computed(() => 
      store.isAuthenticated() && !store.isEmailVerified()
    ),
  })),
  withMethods((store, 
    currencyStore = useCurrencyStore(),
    collaboratorStore = useCollaboratorStore(),
    transactionStore = useTransactionStore(),
    savingsStore = useSavingsStore(),
    travelStore = useTravelStore(),
  ) => ({
    loginStart: () => patchState(store, { loginLoading: true, error: null }),

    loginSuccess: (userId: number, token: string, email: string, name: string, surname: string, isEmailVerified: boolean = false) => {
      patchState(store, {
        userId,
        email,
        name,
        surname,
        token,
        isAuthenticated: true,
        isEmailVerified: isEmailVerified,
        loginLoading: false,
        error: null
      });

      currencyStore.loadCurrencies();
      collaboratorStore.loadCollaborators();
      transactionStore.loadTransactions();
      savingsStore.loadGoals();
      travelStore.loadTravels();
    },

    loginFailure: (error: string) => patchState(store, {
      userId: null,
      email: null,
      name: null,
      surname: null,
      token: null,
      isAuthenticated: false,
      loginLoading: false,
      error
    }),

    // Cerrar sesión
    logout: () => {
      patchState(store, {
        userId: null,
        email: null,
        name: null,
        surname: null,
        token: null,
        isAuthenticated: false,
        isEmailVerified: false,
        loginLoading: false,
        error: null
      });

      currencyStore.clearCurrencies();
      collaboratorStore.clearCollaborators();
      transactionStore.clearTransactions()
      savingsStore.clearAll()
    },

    updateEmailVerificationStatus: (isVerified: boolean) => {
      patchState(store, { isEmailVerified: isVerified });
    },

    // Restaurar sesión desde localStorage
    restoreSession: (userId: number, token: string, email: string, name: string, surname: string, isEmailVerified: boolean) => {
      patchState(store, {
        userId,
        email,
        name,
        surname,
        token,
        isAuthenticated: true,
        loginLoading: false,
        error: null,
        isEmailVerified
      });

      currencyStore.loadCurrencies();
      collaboratorStore.loadCollaborators();
      transactionStore.loadTransactions();
      savingsStore.loadGoals();
      travelStore.loadTravels();
    },

    clearError: () => patchState(store, { error: null })
  }))
);

export const useAuthStore = (): InstanceType<typeof AuthStore> => {
  return inject(AuthStore);
};