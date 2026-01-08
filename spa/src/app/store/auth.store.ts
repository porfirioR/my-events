import { signalStore, withState, withMethods, patchState, withComputed } from '@ngrx/signals';
import { inject, computed } from '@angular/core';
import { useCurrencyStore } from './currency.store';
import { useCollaboratorStore, useSavingsStore, useTransactionStore, useTravelStore } from '.';

export interface AuthState {
  userId: number | null;
  email: string | null;
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
    token: null,
    isAuthenticated: false,
    isEmailVerified: false,
    loginLoading: false,
    error: null
  }),
  withComputed((store) => ({
    isLoggedIn: computed(() => store.isAuthenticated() && !!store.token()),
    currentUser: computed(() => store.userId()),
    currentUserName: computed(() => store.email()?.split('@')[0]),
    currentUserEmail: computed(() => store.email()),
    needsEmailVerification: computed(() => 
      store.isAuthenticated() && !store.isEmailVerified()
    ),
  })),
  withMethods((store, 
    currencyStore = useCurrencyStore(), // ✅ Inyectar stores
    collaboratorStore = useCollaboratorStore(),
    transactionStore = useTransactionStore(),
    savingsStore = useSavingsStore(),
    travelStore = useTravelStore(),
  ) => ({
    loginStart: () => patchState(store, { loginLoading: true, error: null }),
    
    loginSuccess: (userId: number, token: string, email: string, isEmailVerified: boolean = false) => {
      patchState(store, {
        userId,
        email,
        token,
        isAuthenticated: true,
        isEmailVerified: isEmailVerified,
        loginLoading: false,
        error: null
      });
      
      // ✅ Cargar currencies después de login exitoso
      currencyStore.loadCurrencies();
      collaboratorStore.loadCollaborators();
      transactionStore.loadTransactions();
      savingsStore.loadGoals();
      travelStore.loadTravels();
    },

    loginFailure: (error: string) => patchState(store, {
      userId: null,
      email: null,
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
        token: null,
        isAuthenticated: false,
        isEmailVerified: false,
        loginLoading: false,
        error: null
      });
      
      // ✅ Limpiar currencies al logout
      currencyStore.clearCurrencies();
      collaboratorStore.clearCollaborators();
      transactionStore.clearTransactions()
      savingsStore.clearAll()
    },

    updateEmailVerificationStatus: (isVerified: boolean) => {
      patchState(store, { isEmailVerified: isVerified });
    },

    // Restaurar sesión desde localStorage
    restoreSession: (userId: number, token: string, email: string, isEmailVerified: boolean) => {
      patchState(store, {
        userId,
        email,
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