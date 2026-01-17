import { signalStore, withState, withMethods, patchState, withComputed } from '@ngrx/signals';
import { inject, computed } from '@angular/core';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, tap, switchMap, catchError, of } from 'rxjs';
import { CollaboratorApiModel, CollaboratorApiRequest } from '../models/api';
import { CollaboratorApiService } from '../services/api/collaborator-api.service';
import { useLoadingStore } from './loading.store';

export interface CollaboratorState {
  collaborators: CollaboratorApiModel[];
  selectedCollaborator: CollaboratorApiModel | undefined;
  error: string | null;
  filter: string;
  isLoaded: boolean;
}

const initialState: CollaboratorState = {
  collaborators: [],
  selectedCollaborator: undefined,
  error: null,
  filter: '',
  isLoaded: false
};

export const CollaboratorStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),

  withComputed((store) => ({
    // Colaboradores activos
    activeCollaborators: computed(() => 
      store.collaborators().filter(x => x.isActive)
    ),

    // Colaboradores inactivos
    inactiveCollaborators: computed(() => 
      store.collaborators().filter(x => !x.isActive)
    ),

    // Colaboradores filtrados por nombre/apellido/email
    filteredCollaborators: computed(() => {
      const filter = store.filter().toLowerCase();
      if (!filter) return store.collaborators();

      return store.collaborators().filter(x => 
        x.name.toLowerCase().includes(filter) ||
        x.surname.toLowerCase().includes(filter) ||
        x.email?.toLowerCase().includes(filter)
      );
    }),

    // Total de colaboradores
    totalCount: computed(() => store.collaborators().length),
    unlinkedCollaborators: computed(() => store.collaborators().filter(x => x.type == 'UNLINKED' && x.isActive)),
    linkedCollaborators: computed(() => store.collaborators().filter(x => x.type == 'LINKED' && x.isActive)),
    allCollaborators: computed(() => store.collaborators()),
    
    // Verificar si hay error
    hasError: computed(() => !!store.error()),
    
    // Verificar si necesita cargar
    needsLoading: computed(() => !store.isLoaded() && !store.error())
  })),
  
  withMethods((store, 
    collaboratorApiService = inject(CollaboratorApiService),
    loadingStore = useLoadingStore()
  ) => ({
    // Cargar colaboradores si no están cargados
    loadCollaborators: rxMethod<void>(
      pipe(
        tap(() => {
          if (store.isLoaded()) return; // No recargar si ya están cargados
          loadingStore.setLoading();
          patchState(store, { error: null });
        }),
        switchMap(() => {
          if (store.isLoaded()) {
            loadingStore.setLoadingSuccess();
            return of(null); // Skip si ya cargados
          }
          return collaboratorApiService.getAll().pipe(
            tap((collaborators) => {
              patchState(store, {
                collaborators, 
                isLoaded: true,
                error: null 
              });
              loadingStore.setLoadingSuccess();
            }),
            catchError((error) => {
              patchState(store, {
                error: 'Failed to load collaborators' 
              });
              loadingStore.setLoadingFailed();
              console.error('Collaborator loading error:', error);
              return of(null);
            })
          );
        })
      )
    ),

    // Forzar recarga
    reloadCollaborators: rxMethod<void>(
      pipe(
        tap(() => {
          loadingStore.setLoading();
          patchState(store, { error: null, isLoaded: false });
        }),
        switchMap(() => collaboratorApiService.getAll().pipe(
          tap((collaborators) => {
            patchState(store, {
              collaborators, 
              isLoaded: true,
              error: null 
            });
            loadingStore.setLoadingSuccess();
          }),
          catchError((error) => {
            patchState(store, {
              error: 'Failed to reload collaborators' 
            });
            loadingStore.setLoadingFailed();
            console.error('Collaborator reload error:', error);
            return of(null);
          })
        ))
      )
    ),
    // Cargar colaborador por ID
    loadCollaboratorById: rxMethod<number>(
      pipe(
        tap(() => {
          loadingStore.setLoading();
          patchState(store, { error: null });
        }),
        switchMap((id) => collaboratorApiService.getById(id).pipe(
          tap(collaborator => {
            patchState(store, { selectedCollaborator: collaborator });
            loadingStore.setLoadingSuccess();
          }),
          catchError(error => {
            patchState(store, { error: 'Failed to load collaborator' });
            loadingStore.setLoadingFailed();
            console.error('Load collaborator by ID error:', error);
            return of(null);
          })
        ))
      )
    ),

    // Crear o actualizar colaborador
    upsertCollaborator: (request: CollaboratorApiRequest) => {
      loadingStore.setLoading();
      patchState(store, { error: null });

      return collaboratorApiService.upsertCollaborator(request).pipe(
        tap(collaborator => {
          const currentCollaborators = store.collaborators();
          if (request.id) {
            // Actualizar colaborador existente
            const updatedCollaborators = currentCollaborators.map(x => 
              x.id === collaborator.id ? collaborator : x
            );
            patchState(store, {
              collaborators: updatedCollaborators,
              selectedCollaborator: collaborator
            });
          } else {
            // Agregar nuevo colaborador
            patchState(store, { 
              collaborators: [...currentCollaborators, collaborator],
              selectedCollaborator: collaborator
            });
          }
          loadingStore.setLoadingSuccess();
        }),
        catchError(error => {
          patchState(store, { error: 'Failed to upsert collaborator' });
          loadingStore.setLoadingFailed();
          console.error('Upsert collaborator error:', error);
          return of(null);
        })
      );
    },
    
    // Cambiar visibilidad (activar/desactivar)
    changeVisibility: rxMethod<number>(
      pipe(
        tap(() => {
          loadingStore.setLoading();
          patchState(store, { error: null });
        }),
        switchMap((id) => collaboratorApiService.changeVisibility(id).pipe(
          tap(updatedCollaborator => {
            const updatedCollaborators = store.collaborators().map(x => 
              x.id === id ? updatedCollaborator : x
            );
            patchState(store, { collaborators: updatedCollaborators });
            loadingStore.setLoadingSuccess();
          }),
          catchError(error => {
            patchState(store, { error: 'Failed to change visibility' });
            loadingStore.setLoadingFailed();
            console.error('Change visibility error:', error);
            return of(null);
          })
        ))
      )
    ),

    // Métodos auxiliares (no hacen peticiones HTTP)
    setFilter: (filter: string) => patchState(store, { filter }),
    clearFilter: () => patchState(store, { filter: '' }),
    selectCollaborator: (collaborator: CollaboratorApiModel | undefined) => 
      patchState(store, { selectedCollaborator: collaborator }),
    clearError: () => patchState(store, { error: null }),
    clearSelectedCollaborator: () => patchState(store, { selectedCollaborator: undefined }),
    clearCollaborators: () => patchState(store, initialState),
  }))
);

export const useCollaboratorStore = (): InstanceType<typeof CollaboratorStore> => {
  return inject(CollaboratorStore);
};