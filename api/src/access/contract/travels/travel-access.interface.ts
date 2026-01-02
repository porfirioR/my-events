import { CreateTravelAccessRequest, TravelAccessModel, UpdateTravelAccessRequest } from ".";

export interface ITravelAccessService {
  /**
   * Crear un nuevo viaje
   */
  create(request: CreateTravelAccessRequest): Promise<TravelAccessModel>;

  /**
   * Obtener viaje por ID
   */
  getById(id: number, userId: number): Promise<TravelAccessModel | null>;

  /**
   * Obtener todos los viajes de un usuario
   */
  getAllByUserId(userId: number): Promise<TravelAccessModel[]>;

  /**
   * Obtener viajes por estado
   */
  getByStatus(userId: number, status: string): Promise<TravelAccessModel[]>;

  /**
   * Actualizar viaje
   */
  update(request: UpdateTravelAccessRequest): Promise<TravelAccessModel>;

  /**
   * Finalizar viaje
   */
  finalize(id: number, userId: number): Promise<TravelAccessModel>;

  /**
   * Eliminar viaje
   */
  delete(id: number, userId: number): Promise<void>;

  /**
   * Verificar si el usuario es el creador del viaje
   */
  isCreator(travelId: number, userId: number): Promise<boolean>;

  /**
   * Verificar si el usuario es miembro del viaje
   */
  isMember(travelId: number, userId: number): Promise<boolean>;
}