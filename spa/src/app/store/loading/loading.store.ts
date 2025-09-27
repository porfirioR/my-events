import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { inject } from '@angular/core';

export interface LoadingState {
  isLoading: boolean;
}

export const LoadingStore = signalStore(
  { providedIn: 'root' },
  withState<LoadingState>({
    isLoading: false,
  }),
  withMethods((store) => ({
    setLoading: () => patchState(store, { isLoading: true }),
    setLoadingSuccess: () => patchState(store, { isLoading: false }),
    setLoadingFailed: () => patchState(store, { isLoading: false }),
  }))
);

export const useLoadingStore = (): InstanceType<typeof LoadingStore> => {
  return inject(LoadingStore);
};