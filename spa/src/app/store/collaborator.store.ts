// store/collaborator/collaborator.store.ts
import { signalStore, withState, withMethods, patchState, withComputed } from '@ngrx/signals';
import { inject, computed } from '@angular/core';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, tap, switchMap, catchError, throwError } from 'rxjs';
import { CollaboratorApiModel, CollaboratorApiRequest } from '../models/api';
import { CollaboratorApiService } from '../services/api/collaborator-api.service';

export interface CollaboratorState {
  collaborators: CollaboratorApiModel[];
  selectedCollaborator: CollaboratorApiModel | undefined;
  error: string | null;
  filter: string;
}

export const CollaboratorStore = signalStore(
  { providedIn: 'root' },
  withState<CollaboratorState>({
    collaborators: [],
    selectedCollaborator: undefined,
    error: null,
    filter: ''
  }),
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

      return store.collaborators().filter(c => 
        c.name.toLowerCase().includes(filter) ||
        c.surname.toLowerCase().includes(filter) ||
        c.email?.toLowerCase().includes(filter)
      );
    }),

    // Total de colaboradores
    totalCount: computed(() => store.collaborators().length),
    unlinkedCollaborators: computed(() => store.collaborators().filter(x => x.type == 'UNLINKED' && x.isActive)),
    linkedCollaborators: computed(() => store.collaborators().filter(x => x.type == 'LINKED' && x.isActive)),
    allCollaborators: computed(() => store.collaborators()),
  })),
  withMethods((store, collaboratorApiService = inject(CollaboratorApiService)) => ({
    loadCollaborators: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { error: null })),
        switchMap(() => collaboratorApiService.getAll().pipe(
          tap(collaborators => patchState(store, { collaborators })),
          catchError(error => {
            patchState(store, { error: 'Failed to load collaborators' });
            return throwError(() => error);
          })
        ))
      )
    ),
    // Cargar colaborador por ID
    loadCollaboratorById: rxMethod<number>(
      pipe(
        tap(() => patchState(store, { error: null })),
        switchMap((id) => collaboratorApiService.getById(id).pipe(
          tap(collaborator => patchState(store, { selectedCollaborator: collaborator })),
          catchError(error => {
            patchState(store, { error: 'Failed to load collaborator' });
            return throwError(() => error);
          })
        ))
      )
    ),
    // Crear o actualizar colaborador
    upsertCollaborator: (request: CollaboratorApiRequest) => {
      patchState(store, { error: null })
      return collaboratorApiService.upsertCollaborator(request).pipe(
        tap(collaborator => {
          const currentCollaborators = store.collaborators();
          if (request.id) {
            // Actualizar colaborador existente
            const updatedCollaborators = currentCollaborators.map(x => x.id === collaborator.id ? collaborator : x);
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
        })
      )
    },
    // Cambiar visibilidad (activar/desactivar)
    changeVisibility: rxMethod<number>(
      pipe(
        tap(() => patchState(store, { error: null })),
        switchMap((id) => collaboratorApiService.changeVisibility(id).pipe(
          tap(updatedCollaborator => {
            const updatedCollaborators = store.collaborators().map(c => 
              c.id === id ? updatedCollaborator : c
            );
            patchState(store, { collaborators: updatedCollaborators });
          }),
          catchError(error => {
            patchState(store, { error: 'Failed to change visibility' });
            return throwError(() => error);
          })
        ))
      )
    ),

    // Métodos auxiliares (no hacen peticiones HTTP)
    setFilter: (filter: string) => patchState(store, { filter }),
    clearFilter: () => patchState(store, { filter: '' }),
    selectCollaborator: (collaborator: CollaboratorApiModel | undefined) => patchState(store, { selectedCollaborator: collaborator }),
    clearError: () => patchState(store, { error: null }),
    clearSelectedCollaborator: () => patchState(store, { selectedCollaborator: undefined }),
  }))
);

export const useCollaboratorStore = (): InstanceType<typeof CollaboratorStore> => {
  return inject(CollaboratorStore);
};