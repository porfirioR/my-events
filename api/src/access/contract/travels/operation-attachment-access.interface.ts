import { CreateOperationAttachmentAccessRequest, OperationAttachmentAccessModel } from ".";

export interface IOperationAttachmentAccessService {
  /**
   * Crear nuevo attachment
   */
  create(request: CreateOperationAttachmentAccessRequest): Promise<OperationAttachmentAccessModel>;

  /**
   * Obtener attachments por operación
   */
  getByOperationId(operationId: number): Promise<OperationAttachmentAccessModel[]>;

  /**
   * Obtener attachment por ID
   */
  getById(id: number): Promise<OperationAttachmentAccessModel | null>;

  /**
   * Eliminar attachment
   */
  delete(id: number): Promise<void>;

  /**
   * Eliminar todos los attachments de una operación
   */
  deleteAllByOperationId(operationId: number): Promise<void>;

  /**
   * Contar attachments por operación
   */
  countByOperationId(operationId: number): Promise<number>;
}