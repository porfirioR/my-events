import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, of, pipe, switchMap, tap } from 'rxjs';
import { MyMoneyPreviewApiModel } from '../models/api/imports/mymoney-preview-api.model';
import { ImportApiService } from '../services/api/import-api.service';

export interface ImportsState {
  // Último archivo de MyMoney leído; no se guarda nada en la base (#230)
  myMoneyPreview: MyMoneyPreviewApiModel | null;
  isMyMoneyPreviewLoading: boolean;
  // Error de red o del servidor (un archivo inválido no es error: viene con valid = false)
  myMoneyPreviewError: string | null;
}

const initialState: ImportsState = {
  myMoneyPreview: null,
  isMyMoneyPreviewLoading: false,
  myMoneyPreviewError: null,
};

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

    clearMyMoneyPreview: () => patchState(store, initialState),
  })),
);

export const useImportsStore = (): InstanceType<typeof ImportsStore> => inject(ImportsStore);
