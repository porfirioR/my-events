import { CreateTransactionSplitAccessRequest, TransactionSplitAccessModel } from ".";

export interface ITransactionSplitAccessService {
  /**
   * Crea un nuevo split de transacción
   * @param request - Datos del split a crear
   * @returns Promise con el split creado
   */
  create(request: CreateTransactionSplitAccessRequest): Promise<TransactionSplitAccessModel>;

  /**
   * Obtiene todos los splits de una transacción
   * @param transactionId - ID de la transacción
   * @returns Promise con lista de splits
   */
  getByTransaction(transactionId: number): Promise<TransactionSplitAccessModel[]>;

  /**
   * Obtiene splits de un colaborador
   * @param collaboratorId - ID del colaborador
   * @param isSettled - Filtrar por estado de liquidación (opcional)
   * @returns Promise con lista de splits
   */
  getByCollaborator(collaboratorId: number, isSettled?: boolean): Promise<TransactionSplitAccessModel[]>;

  /**
   * Obtiene splits de un usuario
   * @param userId - ID del usuario
   * @param isSettled - Filtrar por estado de liquidación (opcional)
   * @returns Promise con lista de splits
   */
  getByUser(userId: number, isSettled?: boolean): Promise<TransactionSplitAccessModel[]>;

  /**
   * Verifica si una transacción tiene splits sin liquidar
   * @param transactionId - ID de la transacción
   * @returns Promise con true si hay splits sin liquidar
   */
  hasUnsettledSplits(transactionId: number): Promise<boolean>;

  /**
   * Marca un split como liquidado
   * @param id - ID del split
   * @returns Promise<void>
   */
  markAsSettled(id: number): Promise<void>;

  /**
   * Elimina un split
   * @param id - ID del split a eliminar
   * @returns Promise<void>
   */
  delete(id: number): Promise<void>;
}