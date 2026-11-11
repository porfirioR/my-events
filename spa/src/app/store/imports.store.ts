import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, concatMap, mergeMap, of, pipe, switchMap, tap } from 'rxjs';
import { MyMoneyPreviewApiModel } from '../models/api/imports/mymoney-preview-api.model';
import {
  MyMoneyCategoryMappingApiModel,
  MyMoneyCategorySyncApiModel,
  MyMoneyDescriptionRuleApiModel,
  UpdateMyMoneyCategoryMappingApiRequest,
  UpsertMyMoneyDescriptionRuleApiRequest,
} from '../models/api/imports/mymoney-mapping-api.model';
import { ImportApiService } from '../services/api/import-api.service';

export interface ImportsState {
  // Último archivo de MyMoney leído; no se guarda nada en la base (#230)
  myMoneyPreview: MyMoneyPreviewApiModel | null;
  isMyMoneyPreviewLoading: boolean;
  // Error de red o del servidor (un archivo inválido no es error: viene con valid = false)
  myMoneyPreviewError: string | null;

  // Mapeo de categorías y descripciones (#231)
  categoryMappings: MyMoneyCategoryMappingApiModel[];
  isCategoryMappingsLoading: boolean;
  categoryMappingsError: string | null;
  // Resultado de la última sincronización desde un export (se limpia al salir de la pantalla)
  categorySync: MyMoneyCategorySyncApiModel | null;
  isCategorySyncLoading: boolean;
  // Ids de categorías que se están guardando, para deshabilitar su fila
  savingMappingIds: number[];
  descriptionRules: MyMoneyDescriptionRuleApiModel[];
  isDescriptionRuleSaving: boolean;
}

const initialPreviewState = {
  myMoneyPreview: null,
  isMyMoneyPreviewLoading: false,
  myMoneyPreviewError: null,
};

const initialState: ImportsState = {
  ...initialPreviewState,
  categoryMappings: [],
  isCategoryMappingsLoading: false,
  categoryMappingsError: null,
  categorySync: null,
  isCategorySyncLoading: false,
  savingMappingIds: [],
  descriptionRules: [],
  isDescriptionRuleSaving: false,
};

export interface SaveDescriptionRuleParams {
  id: number | null;
  request: UpsertMyMoneyDescriptionRuleApiRequest;
  onSuccess?: () => void;
}

export const ImportsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, importApiService = inject(ImportApiService)) => ({
    previewMyMoney: rxMethod<File>(
      pipe(
        tap(() => patchState(store, { isMyMoneyPreviewLoading: true, myMoneyPreviewError: null, myMoneyPreview: null })),
        switchMap(file =>
          importApiService.previewMyMoney(file).pipe(
            tap(myMoneyPreview => patchState(store, { myMoneyPreview, isMyMoneyPreviewLoading: false })),
            catchError(() => {
              patchState(store, { myMoneyPreviewError: 'Failed to read MyMoney export', isMyMoneyPreviewLoading: false });
              return of(null);
            }),
          ),
        ),
      ),
    ),

    clearMyMoneyPreview: () => patchState(store, initialPreviewState),

    // ==================== CATEGORÍAS ====================

    // Carga categorías y patrones juntos: la pantalla de mapeo muestra las dos cosas
    loadMappings: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { isCategoryMappingsLoading: true, categoryMappingsError: null })),
        switchMap(() =>
          importApiService.getCategoryMappings().pipe(
            tap(categoryMappings => patchState(store, { categoryMappings, isCategoryMappingsLoading: false })),
            switchMap(() => importApiService.getDescriptionRules()),
            tap(descriptionRules => patchState(store, { descriptionRules })),
            catchError(() => {
              patchState(store, { categoryMappingsError: 'Failed to load MyMoney mappings', isCategoryMappingsLoading: false });
              return of(null);
            }),
          ),
        ),
      ),
    ),

    syncCategoryMappings: rxMethod<File>(
      pipe(
        tap(() => patchState(store, { isCategorySyncLoading: true, categorySync: null })),
        switchMap(file =>
          importApiService.syncCategoryMappings(file).pipe(
            tap(categorySync => patchState(store, {
              categorySync,
              categoryMappings: categorySync.mappings,
              isCategorySyncLoading: false,
            })),
            catchError(() => {
              patchState(store, { isCategorySyncLoading: false });
              return of(null);
            }),
          ),
        ),
      ),
    ),

    clearCategorySync: () => patchState(store, { categorySync: null }),

    // Cada fila se guarda sola al cambiar: mergeMap deja guardar varias a la vez
    updateCategoryMapping: rxMethod<{ id: number; request: UpdateMyMoneyCategoryMappingApiRequest }>(
      pipe(
        tap(({ id }) => patchState(store, { savingMappingIds: [...store.savingMappingIds(), id] })),
        mergeMap(({ id, request }) =>
          importApiService.updateCategoryMapping(id, request).pipe(
            tap(updated => patchState(store, {
              categoryMappings: store.categoryMappings().map(mapping => (mapping.id === updated.id ? updated : mapping)),
            })),
            catchError(() => of(null)),
            tap(() => patchState(store, { savingMappingIds: store.savingMappingIds().filter(savingId => savingId !== id) })),
          ),
        ),
      ),
    ),

    // ==================== DESCRIPCIONES ====================

    saveDescriptionRule: rxMethod<SaveDescriptionRuleParams>(
      pipe(
        tap(() => patchState(store, { isDescriptionRuleSaving: true })),
        concatMap(({ id, request, onSuccess }) =>
          (id === null ? importApiService.createDescriptionRule(request) : importApiService.updateDescriptionRule(id, request)).pipe(
            tap(saved => {
              const others = store.descriptionRules().filter(rule => rule.id !== saved.id);
              patchState(store, {
                descriptionRules: [...others, saved].sort((a, b) => a.pattern.localeCompare(b.pattern)),
                isDescriptionRuleSaving: false,
              });
              onSuccess?.();
            }),
            catchError(() => {
              patchState(store, { isDescriptionRuleSaving: false });
              return of(null);
            }),
          ),
        ),
      ),
    ),

    deleteDescriptionRule: rxMethod<number>(
      pipe(
        mergeMap(id =>
          importApiService.deleteDescriptionRule(id).pipe(
            tap(() => patchState(store, { descriptionRules: store.descriptionRules().filter(rule => rule.id !== id) })),
            catchError(() => of(null)),
          ),
        ),
      ),
    ),
  })),
);

export const useImportsStore = (): InstanceType<typeof ImportsStore> => inject(ImportsStore);
