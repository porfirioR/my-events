import { CreateApprovalAccessRequest, TravelOperationApprovalAccessModel } from ".";

export interface ITravelOperationApprovalAccessService {
  /**
   * Crear aprobación
   */
  create(request: CreateApprovalAccessRequest): Promise<TravelOperationApprovalAccessModel>;

  /**
   * Crear múltiples aprobaciones (batch)
   */
  createMultiple(requests: CreateApprovalAccessRequest[]): Promise<TravelOperationApprovalAccessModel[]>;

  /**
   * Obtener aprobaciones de una operación
   */
  getByOperationId(operationId: number): Promise<TravelOperationApprovalAccessModel[]>;

  /**
   * Obtener aprobación específica
   */
  getByOperationAndMember(operationId: number, memberId: number): Promise<TravelOperationApprovalAccessModel | null>;

  /**
   * Aprobar operación
   */
  approve(operationId: number, memberId: number): Promise<TravelOperationApprovalAccessModel>;

  /**
   * Rechazar operación
   */
  reject(operationId: number, memberId: number, rejectionReason: string): Promise<TravelOperationApprovalAccessModel>;

  /**
   * Eliminar aprobación
   */
  delete(id: number): Promise<void>;

  /**
   * Eliminar todas las aprobaciones de una operación
   */
  deleteAllByOperationId(operationId: number): Promise<void>;

  /**
   * Verificar si una operación está completamente aprobada
   */
  isFullyApproved(operationId: number): Promise<boolean>;

  /**
   * Verificar si una operación tiene algún rechazo
   */
  hasRejections(operationId: number): Promise<boolean>;

  /**
   * Obtener cantidad de aprobaciones pendientes
   */
  getPendingCount(operationId: number): Promise<number>;

  /**
   * Obtener cantidad total de aprobaciones necesarias
   */
  getTotalCount(operationId: number): Promise<number>;
}