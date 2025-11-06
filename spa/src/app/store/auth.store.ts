import { signalStore, withState, withMethods, patchState, withComputed } from '@ngrx/signals';
import { inject, computed } from '@angular/core';

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
    currentUserEmail: computed(() => store.email()),
    needsEmailVerification: computed(() => 
      store.isAuthenticated() && !store.isEmailVerified()
    ),
  })),
  withMethods((store) => ({
    loginStart: () => patchState(store, { loginLoading: true, error: null }),
    loginSuccess: (userId: number, token: string, email: string, isEmailVerified: boolean = false) => patchState(store, {
      userId,
      email,
      token,
      isAuthenticated: true,
      isEmailVerified: isEmailVerified,
      loginLoading: false,
      error: null
    }),

    loginFailure: (error: string) => patchState(store, {
      userId: null,
      email: null,
      token: null,
      isAuthenticated: false,
      loginLoading: false,
      error
    }),

    // Cerrar sesión
    logout: () => patchState(store, {
      userId: null,
      email: null,
      token: null,
      isAuthenticated: false,
      loginLoading: false,
      error: null
    }),

    updateEmailVerificationStatus: (isVerified: boolean) => {
      patchState(store, { isEmailVerified: isVerified });
    },

    // Restaurar sesión desde localStorage
    restoreSession: (userId: number, token: string, email: string, isEmailVerified: boolean) => patchState(store, {
      userId,
      email,
      token,
      isAuthenticated: true,
      loginLoading: false,
      error: null,
      isEmailVerified
    }),

    clearError: () => patchState(store, { error: null })
  }))
);

export const useAuthStore = (): InstanceType<typeof AuthStore> => {
  return inject(AuthStore);
};