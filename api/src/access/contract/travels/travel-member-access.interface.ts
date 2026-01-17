import { AddTravelMemberAccessRequest, TravelMemberAccessModel } from ".";

export interface ITravelMemberAccessService {
  /**
   * Agregar miembro al viaje
   */
  add(request: AddTravelMemberAccessRequest): Promise<TravelMemberAccessModel>;

  /**
   * Obtener todos los miembros de un viaje
   */
  getByTravelId(travelId: number): Promise<TravelMemberAccessModel[]>;

  /**
   * Obtener miembro específico
   */
  getById(id: number): Promise<TravelMemberAccessModel | null>;

  /**
   * Verificar si un colaborador ya está en el viaje
   */
  isMemberInTravel(travelId: number, collaboratorId: number): Promise<boolean>;

  /**
   * Eliminar miembro del viaje
   */
  remove(id: number): Promise<void>;

  /**
   * Verificar si el miembro tiene operaciones asociadas
   */
  hasOperations(memberId: number): Promise<boolean>;

  /**
   * Obtener cantidad de miembros en un viaje
   */
  getMemberCount(travelId: number): Promise<number>;
  isUserInTravel(travelId: number, userId: number): Promise<boolean>;
}