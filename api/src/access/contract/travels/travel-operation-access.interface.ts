import { CreateTravelOperationAccessRequest, TravelOperationAccessModel, UpdateTravelOperationAccessRequest } from ".";

export interface ITravelOperationAccessService {
  /**
   * Crear una nueva operación
   */
  create(request: CreateTravelOperationAccessRequest): Promise<TravelOperationAccessModel>;

  /**
   * Obtener operación por ID
   */
  getById(id: number): Promise<TravelOperationAccessModel | null>;

  /**
   * Obtener todas las operaciones de un viaje
   */
  getByTravelId(travelId: number): Promise<TravelOperationAccessModel[]>;

  /**
   * Obtener operaciones por estado
   */
  getByStatus(travelId: number, status: string): Promise<TravelOperationAccessModel[]>;

  /**
   * Actualizar operación
   */
  update(request: UpdateTravelOperationAccessRequest): Promise<TravelOperationAccessModel>;

  /**
   * Actualizar estado de operación
   */
  updateStatus(id: number, status: string): Promise<TravelOperationAccessModel>;

  /**
   * Eliminar operación
   */
  delete(id: number): Promise<void>;

  /**
   * Verificar si todas las operaciones del viaje están aprobadas
   */
  areAllApproved(travelId: number): Promise<boolean>;

  /**
   * Contar operaciones de un viaje
   */
  countByTravelId(travelId: number): Promise<number>;

  /**
   * Obtener operaciones agrupadas por moneda
   */
  getGroupedByCurrency(travelId: number): Promise<{ currencyId: number; operations: TravelOperationAccessModel[] }[]>;
}