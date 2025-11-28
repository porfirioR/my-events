import { computed, inject } from '@angular/core';
import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, tap, switchMap, catchError, of } from 'rxjs';
import { CurrencyApiModel } from '../models/api';
import { useLoadingStore } from './loading.store';
import { ConfigurationApiService } from '../services';

// State interface
interface CurrencyState {
  currencies: CurrencyApiModel[];
  error: string | null;
  isLoaded: boolean;
}

// Initial state
const initialState: CurrencyState = {
  currencies: [],
  error: null,
  isLoaded: false
};

export const CurrencyStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  
  withComputed((state) => ({
    // Computed para buscar currency por ID
    getCurrencyById: computed(() => (id: number) => 
      state.currencies().find(c => c.id === id)
    ),
    
    // Computed para formatear moneda
    formatCurrency: computed(() => (amount: number, currencyId: number) => {
      const currency = state.currencies().find(c => c.id === currencyId);
      if (!currency) {
        console.warn(`Currency with ID ${currencyId} not found`);
        return amount.toString(); // Fallback
      }
      
      return new Intl.NumberFormat(currency.locale, {
        style: 'currency',
        currency: currency.currencyCode,
        minimumFractionDigits: currency.minimumDecimal
      }).format(amount);
    }),

    // Computed para obtener todas las currencies para dropdowns
    getAllCurrencies: computed(() => state.currencies()),
    
    // Computed para verificar si hay error
    hasError: computed(() => !!state.error()),
    
    // Computed para verificar si necesita cargar
    needsLoading: computed(() => !state.isLoaded() && !state.error())
  })),
  
  withMethods((store, 
    configurationApiService = inject(ConfigurationApiService),
    loadingStore = useLoadingStore()
  ) => ({
    // Cargar currencies si no están cargadas
    loadCurrencies: rxMethod<void>(
      pipe(
        tap(() => {
          if (store.isLoaded()) return; // No recargar si ya están cargadas
          loadingStore.setLoading();
          patchState(store, { error: null }); // ✅ Usar patchState como función
        }),
        switchMap(() => {
          if (store.isLoaded()) {
            loadingStore.setLoadingSuccess();
            return of(null); // Skip si ya cargadas
          }
          
          return configurationApiService.getCurrencies().pipe(
            tap((currencies) => {
              patchState(store, {  // ✅ Usar patchState como función
                currencies, 
                isLoaded: true,
                error: null 
              });
              loadingStore.setLoadingSuccess();
            }),
            catchError((error) => {
              patchState(store, {  // ✅ Usar patchState como función
                error: 'Failed to load currencies' 
              });
              loadingStore.setLoadingFailed();
              console.error('Currency loading error:', error);
              return of(null);
            })
          );
        })
      )
    ),

    // Forzar recarga
    reloadCurrencies: rxMethod<void>(
      pipe(
        tap(() => {
          loadingStore.setLoading();
          patchState(store, { error: null, isLoaded: false }); // ✅ Usar patchState como función
        }),
        switchMap(() => configurationApiService.getCurrencies().pipe(
          tap((currencies) => {
            patchState(store, {  // ✅ Usar patchState como función
              currencies, 
              isLoaded: true,
              error: null 
            });
            loadingStore.setLoadingSuccess();
          }),
          catchError((error) => {
            patchState(store, {  // ✅ Usar patchState como función
              error: 'Failed to reload currencies' 
            });
            loadingStore.setLoadingFailed();
            console.error('Currency reload error:', error);
            return of(null);
          })
        ))
      )
    ),

    // Limpiar error
    clearError: () => patchState(store, { error: null }) // ✅ Usar patchState como función
  }))
);

// Hook para facilitar el uso
export const useCurrencyStore = (): InstanceType<typeof CurrencyStore> => {
  return inject(CurrencyStore);
};