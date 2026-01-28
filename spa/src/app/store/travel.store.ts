import { signalStore, withState, withMethods, patchState, withComputed } from '@ngrx/signals';
import { inject, computed } from '@angular/core';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, tap, switchMap, catchError, of } from 'rxjs';
import {
  TravelApiModel,
  TravelMemberApiModel,
  TravelOperationApiModel,
  TravelBalanceByCurrencyApiModel,
  PaymentMethodApiModel,
  CreateTravelApiRequest,
  UpdateTravelApiRequest,
  AddTravelMemberApiRequest,
  CreateTravelOperationApiRequest,
  UpdateTravelOperationApiRequest,
  RejectOperationApiRequest,
  OperationCategoryApiModel,
  OperationCategorySummaryApiModel,
  OperationAttachmentApiModel
} from '../models/api/travels';
import { TravelApiService } from '../services/api/travel-api.service';
import { useLoadingStore } from './loading.store';

export interface TravelState {
  travels: TravelApiModel[];
  selectedTravel: TravelApiModel | undefined;
  members: TravelMemberApiModel[];
  operations: TravelOperationApiModel[];
  balances: TravelBalanceByCurrencyApiModel[];
  paymentMethods: PaymentMethodApiModel[];
  categories: OperationCategoryApiModel[];
  categorySummary: OperationCategorySummaryApiModel[];
  attachments: Record<number, OperationAttachmentApiModel[]>;
  error: string | null;
  filterStatus: string | null;
  isTravelsLoaded: boolean;
  isMembersLoaded: boolean;
  isOperationsLoaded: boolean;
  isBalancesLoaded: boolean;
  isPaymentMethodsLoaded: boolean;
  isCategoriesLoaded: boolean;
  isCategorySummaryLoaded: boolean;
}

const initialState: TravelState = {
  travels: [],
  selectedTravel: undefined,
  members: [],
  operations: [],
  balances: [],
  paymentMethods: [],
  categories: [],
  categorySummary: [],
  attachments: {},
  error: null,
  filterStatus: null,
  isTravelsLoaded: false,
  isMembersLoaded: false,
  isOperationsLoaded: false,
  isBalancesLoaded: false,
  isPaymentMethodsLoaded: false,
  isCategoriesLoaded: false,
  isCategorySummaryLoaded: false
};

export const TravelStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),

  withComputed((store) => ({
    // Viajes activos
    activeTravels: computed(() =>
      store.travels().filter(t => t.status === 'Active')
    ),

    // Viajes finalizados
    finalizedTravels: computed(() =>
      store.travels().filter(t => t.status === 'Finalized')
    ),

    // Viajes filtrados
    filteredTravels: computed(() => {
      const statusFilter = store.filterStatus();
      if (!statusFilter) return store.travels();
      return store.travels().filter(t => t.status === statusFilter);
    }),

    // Total de viajes
    totalTravels: computed(() => store.travels().length),

    // Operaciones pendientes del viaje seleccionado
    pendingOperations: computed(() =>
      store.operations().filter(o => o.status === 'Pending')
    ),

    // Operaciones aprobadas del viaje seleccionado
    approvedOperations: computed(() =>
      store.operations().filter(o => o.status === 'Approved')
    ),

    // Operaciones rechazadas del viaje seleccionado
    rejectedOperations: computed(() =>
      store.operations().filter(o => o.status === 'Rejected')
    ),

    // Operaciones ordenadas por fecha
    sortedOperations: computed(() =>
      [...store.operations()].sort((a, b) =>
        new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
      )
    ),

    // Total de miembros
    totalMembers: computed(() => store.members().length),

    // Total de operaciones
    totalOperations: computed(() => store.operations().length),
    
    // Verificar si hay error
    hasError: computed(() => !!store.error()),
    
    // Verificar si necesita cargar
    needsLoadingTravels: computed(() => !store.isTravelsLoaded() && !store.error()),
    needsLoadingMembers: computed(() => !store.isMembersLoaded() && !store.error()),
    needsLoadingOperations: computed(() => !store.isOperationsLoaded() && !store.error()),
    needsLoadingBalances: computed(() => !store.isBalancesLoaded() && !store.error()),
    needsLoadingPaymentMethods: computed(() => !store.isPaymentMethodsLoaded() && !store.error()),

    needsLoadingCategories: computed(() => !store.isCategoriesLoaded() && !store.error()),
    needsLoadingCategorySummary: computed(() => !store.isCategorySummaryLoaded() && !store.error()),

    // Computed para obtener categoría por ID
    getCategoryById: computed(() => (id?: number) => 
      store.categories().find(x => x.id === id)
    ),

    // Computed para operaciones con categoría enriquecida
    operationsWithCategory: computed(() => 
      store.operations().map(op => ({
        ...op,
        category: store.categories().find(cat => cat.id === op.categoryId)
      }))
    ),

    // Computed para attachments por operación
    getAttachmentsForOperation: computed(() => (operationId: number) => 
      store.attachments()[operationId] || []
    ),

    // Computed para contar attachments por operación
    getAttachmentCountForOperation: computed(() => (operationId: number) => 
      (store.attachments()[operationId] || []).length
    ),

    // Computed para categorías activas
    activeCategories: computed(() =>
      store.categories().filter(cat => cat.isActive)
    ),

    // Computed para resumen ordenado por total
    sortedCategorySummary: computed(() =>
      [...store.categorySummary()].sort((a, b) => b.totalAmount - a.totalAmount)
    )
  })),
  
  withMethods((store, 
    travelApiService = inject(TravelApiService),
    loadingStore = useLoadingStore()
  ) => ({
    // ==================== PAYMENT METHODS ====================

    loadPaymentMethods: rxMethod<void>(
      pipe(
        tap(() => {
          if (store.isPaymentMethodsLoaded()) return;
          loadingStore.setLoading();
          patchState(store, { error: null });
        }),
        switchMap(() => {
          if (store.isPaymentMethodsLoaded()) {
            loadingStore.setLoadingSuccess();
            return of(null);
          }

          return travelApiService.getAllPaymentMethods().pipe(
            tap(paymentMethods => {
              patchState(store, { 
                paymentMethods,
                isPaymentMethodsLoaded: true 
              });
              loadingStore.setLoadingSuccess();
            }),
            catchError(error => {
              patchState(store, { error: 'Failed to load payment methods' });
              console.error('Payment methods loading error:', error);
              throw new Error(error);
            })
          );
        })
      )
    ),

    // ==================== TRAVELS ====================

    loadTravels: rxMethod<void>(
      pipe(
        tap(() => {
          if (store.isTravelsLoaded()) return;
          loadingStore.setLoading();
          patchState(store, { error: null });
        }),
        switchMap(() => {
          if (store.isTravelsLoaded()) {
            loadingStore.setLoadingSuccess();
            return of(null);
          }

          return travelApiService.getAllTravels().pipe(
            tap(travels => {
              patchState(store, { 
                travels,
                isTravelsLoaded: true 
              });
              loadingStore.setLoadingSuccess();
            }),
            catchError(error => {
              patchState(store, { error: 'Failed to load travels' });
              console.error('Travels loading error:', error);
              throw new Error(error);
            })
          );
        })
      )
    ),

    reloadTravels: rxMethod<void>(
      pipe(
        tap(() => {
          loadingStore.setLoading();
          patchState(store, { error: null, isTravelsLoaded: false });
        }),
        switchMap(() => travelApiService.getAllTravels().pipe(
          tap(travels => {
            patchState(store, { 
              travels,
              isTravelsLoaded: true 
            });
            loadingStore.setLoadingSuccess();
          }),
          catchError(error => {
            patchState(store, { error: 'Failed to reload travels' });
            console.error('Travels reload error:', error);
            throw new Error(error);
          })
        ))
      )
    ),

    loadTravelById: rxMethod<number>(
      pipe(
        tap(() => {
          loadingStore.setLoading();
          patchState(store, { error: null });
        }),
        switchMap((id) => travelApiService.getTravelById(id).pipe(
          tap(travel => {
            patchState(store, { selectedTravel: travel });
            loadingStore.setLoadingSuccess();
          }),
          catchError(error => {
            patchState(store, { error: 'Failed to load travel' });
            console.error('Load travel by ID error:', error);
            throw new Error(error);
          })
        ))
      )
    ),

    createTravel: (request: CreateTravelApiRequest) => {
      loadingStore.setLoading();
      patchState(store, { error: null });
      
      return travelApiService.createTravel(request).pipe(
        tap(travel => {
          const currentTravels = store.travels();
          patchState(store, {
            travels: [...currentTravels, travel],
            selectedTravel: travel
          });
          loadingStore.setLoadingSuccess();
        }),
        catchError(error => {
          patchState(store, { error: 'Failed to create travel' });
          console.error('Create travel error:', error);
          throw new Error(error);
        })
      );
    },

    updateTravel: (id: number, request: UpdateTravelApiRequest) => {
      loadingStore.setLoading();
      patchState(store, { error: null });
      
      return travelApiService.updateTravel(id, request).pipe(
        tap(updatedTravel => {
          const updatedTravels = store.travels().map(t =>
            t.id === id ? updatedTravel : t
          );
          patchState(store, {
            travels: updatedTravels,
            selectedTravel: updatedTravel
          });
          loadingStore.setLoadingSuccess();
        }),
        catchError(error => {
          patchState(store, { error: 'Failed to update travel' });
          console.error('Update travel error:', error);
          throw new Error(error);
        })
      );
    },

    finalizeTravel: rxMethod<number>(
      pipe(
        tap(() => {
          loadingStore.setLoading();
          patchState(store, { error: null });
        }),
        switchMap((id) => travelApiService.finalizeTravel(id).pipe(
          tap(finalizedTravel => {
            const updatedTravels = store.travels().map(t =>
              t.id === id ? finalizedTravel : t
            );
            patchState(store, {
              travels: updatedTravels,
              selectedTravel: finalizedTravel
            });
            loadingStore.setLoadingSuccess();
          }),
          catchError(error => {
            patchState(store, { error: 'Failed to finalize travel' });
            console.error('Finalize travel error:', error);
            throw new Error(error);
          })
        ))
      )
    ),

    deleteTravel: rxMethod<number>(
      pipe(
        tap(() => {
          loadingStore.setLoading();
          patchState(store, { error: null });
        }),
        switchMap((id) => travelApiService.deleteTravel(id).pipe(
          tap(() => {
            const updatedTravels = store.travels().filter(t => t.id !== id);
            patchState(store, {
              travels: updatedTravels,
              selectedTravel: undefined
            });
            loadingStore.setLoadingSuccess();
          }),
          catchError(error => {
            patchState(store, { error: 'Failed to delete travel' });
            console.error('Delete travel error:', error);
            throw new Error(error);
          })
        ))
      )
    ),

    // ==================== TRAVEL MEMBERS ====================

    loadMembers: rxMethod<number>(
      pipe(
        tap(() => {
          loadingStore.setLoading();
          patchState(store, { error: null });
        }),
        switchMap((travelId) => travelApiService.getTravelMembers(travelId).pipe(
          tap(members => {
            patchState(store, { 
              members,
              isMembersLoaded: true 
            });
            loadingStore.setLoadingSuccess();
          }),
          catchError(error => {
            patchState(store, { error: 'Failed to load members' });
            console.error('Load members error:', error);
            throw new Error(error);
          })
        ))
      )
    ),

    addMember: (travelId: number, request: AddTravelMemberApiRequest) => {
      loadingStore.setLoading();
      patchState(store, { error: null });

      return travelApiService.addTravelMember(travelId, request).pipe(
        tap(member => {
          const currentMembers = store.members();
          patchState(store, {
            members: [...currentMembers, member]
          });
          loadingStore.setLoadingSuccess();
        }),
        catchError(error => {
          patchState(store, { error: 'Failed to add member' });
          console.error('Add member error:', error);
          throw new Error(error);
        })
      );
    },

    removeMember: rxMethod<number>(
      pipe(
        tap(() => {
          loadingStore.setLoading();
          patchState(store, { error: null });
        }),
        switchMap((memberId) => travelApiService.removeTravelMember(memberId).pipe(
          tap(() => {
            const updatedMembers = store.members().filter(m => m.id !== memberId);
            patchState(store, { members: updatedMembers });
            loadingStore.setLoadingSuccess();
          }),
          catchError(error => {
            patchState(store, { error: 'Failed to remove member' });
            console.error('Remove member error:', error);
            throw new Error(error);
          })
        ))
      )
    ),

    // ==================== TRAVEL OPERATIONS ====================

    loadOperations: rxMethod<number>(
      pipe(
        tap(() => {
          loadingStore.setLoading();
          patchState(store, { error: null });
        }),
        switchMap((travelId) => travelApiService.getTravelOperations(travelId).pipe(
          tap(operations => {
            patchState(store, { 
              operations,
              isOperationsLoaded: true 
            });
            loadingStore.setLoadingSuccess();
          }),
          catchError(error => {
            patchState(store, { error: 'Failed to load operations' });
            console.error('Load operations error:', error);
            throw new Error(error);
          })
        ))
      )
    ),

    loadOperationById: (operationId: number) => {
      loadingStore.setLoading();
      patchState(store, { error: null });
      
      return travelApiService.getTravelOperationById(operationId).pipe(
        tap(() => {
          loadingStore.setLoadingSuccess();
        }),
        catchError(error => {
          patchState(store, { error: 'Failed to load operation' });
          console.error('Load operation error:', error);
          throw new Error(error);
        })
      );
    },

    createOperation: (travelId: number, request: CreateTravelOperationApiRequest) => {
      loadingStore.setLoading();
      patchState(store, { error: null });
      
      return travelApiService.createTravelOperation(travelId, request).pipe(
        tap(operation => {
          const currentOperations = store.operations();
          patchState(store, {
            operations: [...currentOperations, operation]
          });
          loadingStore.setLoadingSuccess();
        }),
        catchError(error => {
          patchState(store, { error: 'Failed to create operation' });
          console.error('Create operation error:', error);
          throw new Error(error);
        })
      );
    },

    updateOperation: (travelId: number, operationId: number, request: UpdateTravelOperationApiRequest) => {
      loadingStore.setLoading();
      patchState(store, { error: null });

      return travelApiService.updateTravelOperation(travelId, operationId, request).pipe(
        tap(updatedOperation => {
          const updatedOperations = store.operations().map(x =>
            x.id === operationId ? updatedOperation : x
          );
          patchState(store, { operations: updatedOperations });
          loadingStore.setLoadingSuccess();
        }),
        catchError(error => {
          patchState(store, { error: 'Failed to update operation' });
          console.error('Update operation error:', error);
          throw new Error(error);
        })
      );
    },

    deleteOperation: rxMethod<number>(
      pipe(
        tap(() => {
          loadingStore.setLoading();
          patchState(store, { error: null });
        }),
        switchMap((operationId) => travelApiService.deleteTravelOperation(operationId).pipe(
          tap(() => {
            const updatedOperations = store.operations().filter(o => o.id !== operationId);
            patchState(store, { operations: updatedOperations });
            loadingStore.setLoadingSuccess();
          }),
          catchError(error => {
            patchState(store, { error: 'Failed to delete operation' });
            console.error('Delete operation error:', error);
            throw new Error(error);
          })
        ))
      )
    ),

    approveOperation: rxMethod<number>(
      pipe(
        tap(() => {
          loadingStore.setLoading();
          patchState(store, { error: null });
        }),
        switchMap((operationId) => travelApiService.approveOperation(operationId).pipe(
          tap(updatedOperation => {
            const updatedOperations = store.operations().map(o =>
              o.id === operationId ? updatedOperation : o
            );
            patchState(store, { operations: updatedOperations });
            loadingStore.setLoadingSuccess();
          }),
          catchError(error => {
            patchState(store, { error: 'Failed to approve operation' });
            console.error('Approve operation error:', error);
            throw new Error(error);
          })
        ))
      )
    ),

    rejectOperation: (operationId: number, request: RejectOperationApiRequest) => {
      loadingStore.setLoading();
      patchState(store, { error: null });

      return travelApiService.rejectOperation(operationId, request).pipe(
        tap(updatedOperation => {
          const updatedOperations = store.operations().map(o =>
            o.id === operationId ? updatedOperation : o
          );
          patchState(store, { operations: updatedOperations });
          loadingStore.setLoadingSuccess();
        }),
        catchError(error => {
          patchState(store, { error: 'Failed to reject operation' });
          console.error('Reject operation error:', error);
          throw new Error(error);
        })
      );
    },

    // ==================== TRAVEL BALANCES ====================

    loadBalances: rxMethod<number>(
      pipe(
        tap(() => {
          loadingStore.setLoading();
          patchState(store, { error: null });
        }),
        switchMap((travelId) => travelApiService.getTravelBalances(travelId).pipe(
          tap(balances => {
            patchState(store, { 
              balances,
              isBalancesLoaded: true 
            });
            loadingStore.setLoadingSuccess();
          }),
          catchError(error => {
            patchState(store, { error: 'Failed to load balances' });
            console.error('Load balances error:', error);
            throw new Error(error);
          })
        ))
      )
    ),

    loadCategories: rxMethod<void>(
      pipe(
        tap(() => {
          if (store.isCategoriesLoaded()) return;
          loadingStore.setLoading();
          patchState(store, { error: null });
        }),
        switchMap(() => {
          if (store.isCategoriesLoaded()) {
            loadingStore.setLoadingSuccess();
            return of(null);
          }

          return travelApiService.getAllOperationCategories().pipe(
            tap(categories => {
              patchState(store, { 
                categories,
                isCategoriesLoaded: true 
              });
              loadingStore.setLoadingSuccess();
            }),
            catchError(error => {
              patchState(store, { error: 'Failed to load categories' });
              console.error('Categories loading error:', error);
              throw new Error(error);
            })
          );
        })
      )
    ),

    loadCategorySummary: rxMethod<number>(
      pipe(
        tap(() => {
          loadingStore.setLoading();
          patchState(store, { error: null });
        }),
        switchMap((travelId) => travelApiService.getTravelCategorySummary(travelId).pipe(
          tap(categorySummary => {
            patchState(store, { 
              categorySummary,
              isCategorySummaryLoaded: true 
            });
            loadingStore.setLoadingSuccess();
          }),
          catchError(error => {
            patchState(store, { error: 'Failed to load category summary' });
            console.error('Category summary loading error:', error);
            throw new Error(error);
          })
        ))
      )
    ),

    // ==================== NUEVOS MÉTODOS - ATTACHMENTS ====================

    loadOperationAttachments: rxMethod<number>(
      pipe(
        tap(() => {
          loadingStore.setLoading();
          patchState(store, { error: null });
        }),
        switchMap((operationId) => travelApiService.getOperationAttachments(operationId).pipe(
          tap((attachments) => {
            const currentAttachments = store.attachments();
            patchState(store, {
              attachments: {
                ...currentAttachments,
                [operationId]: attachments
              }
            });
            loadingStore.setLoadingSuccess();
          }),
          catchError(error => {
            patchState(store, { error: 'Failed to load attachments' });
            console.error('Attachments loading error:', error);
            throw new Error(error);
          })
        ))
      )
    ),

    uploadAttachment: (operationId: number, file: File) => {
      loadingStore.setLoading();
      patchState(store, { error: null });
      
      return travelApiService.uploadOperationAttachment(operationId, file).pipe(
        tap((newAttachment) => {
          const currentAttachments = store.attachments();
          const operationAttachments = currentAttachments[operationId] || [];
          
          patchState(store, {
            attachments: {
              ...currentAttachments,
              [operationId]: [...operationAttachments, newAttachment]
            }
          });
          loadingStore.setLoadingSuccess();
        }),
        catchError(error => {
          patchState(store, { error: 'Failed to upload attachment' });
          console.error('Upload attachment error:', error);
          throw new Error(error);
        })
      );
    },

    deleteAttachment: rxMethod<{attachmentId: number, operationId: number}>(
      pipe(
        tap(() => {
          loadingStore.setLoading();
          patchState(store, { error: null });
        }),
        switchMap(({attachmentId, operationId}) => 
          travelApiService.deleteOperationAttachment(attachmentId).pipe(
            tap(() => {
              const currentAttachments = store.attachments();
              const operationAttachments = currentAttachments[operationId] || [];
              
              patchState(store, {
                attachments: {
                  ...currentAttachments,
                  [operationId]: operationAttachments.filter(att => att.id !== attachmentId)
                }
              });
              loadingStore.setLoadingSuccess();
            }),
            catchError(error => {
              patchState(store, { error: 'Failed to delete attachment' });
              console.error('Delete attachment error:', error);
              throw new Error(error);
            })
          )
        )
      )
    ),

    // ==================== FILTERS ====================

    setStatusFilter: (status: string | null) =>
      patchState(store, { filterStatus: status }),

    clearFilters: () =>
      patchState(store, { filterStatus: null }),

    // ==================== UTILITY ====================

    selectTravel: (travel: TravelApiModel | undefined) =>
      patchState(store, { selectedTravel: travel }),

    clearSelectedTravel: () =>
      patchState(store, {
        selectedTravel: undefined,
        members: [],
        operations: [],
        balances: [],
        categorySummary: [],
        attachments: {},
        isMembersLoaded: false,
        isOperationsLoaded: false,
        isBalancesLoaded: false,
        isCategorySummaryLoaded: false
      }),

    clearError: () =>
      patchState(store, { error: null }),

    clearAll: () =>
      patchState(store, initialState)
  }))
);

export const useTravelStore = (): InstanceType<typeof TravelStore> => {
  return inject(TravelStore);
};