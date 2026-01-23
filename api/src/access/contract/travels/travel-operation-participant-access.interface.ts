import { AddOperationParticipantAccessRequest, TravelOperationParticipantAccessModel } from ".";

export interface ITravelOperationParticipantAccessService {
  /**
   * Agregar participante a una operación
   */
  add(request: AddOperationParticipantAccessRequest): Promise<TravelOperationParticipantAccessModel>;

  /**
   * Agregar múltiples participantes (batch)
   */
  addMultiple(requests: AddOperationParticipantAccessRequest[]): Promise<TravelOperationParticipantAccessModel[]>;

  /**
   * Obtener participantes de una operación
   */
  getByOperationId(operationId: number): Promise<TravelOperationParticipantAccessModel[]>;

  /**
   * Actualizar shareAmount de un participante
   */
  updateShareAmount(id: number, shareAmount: number): Promise<TravelOperationParticipantAccessModel>;

  /**
   * Eliminar participante
   */
  remove(id: number): Promise<void>;

  /**
   * Eliminar todos los participantes de una operación
   */
  removeAllByOperationId(operationId: number): Promise<void>;

  /**
   * Verificar si un miembro es participante de una operación
   */
  isParticipant(operationId: number, travelMemberId: number): Promise<boolean>;

  /**
   * Obtener total de participantes en una operación
   */
  getParticipantCount(operationId: number): Promise<number>;

  /**
   * Remover participante específico
   */
  removeParticipant(operationId: number, memberId: number): Promise<void>;
}