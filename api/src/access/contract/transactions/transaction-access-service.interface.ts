import { CreateTransactionAccessRequest, TransactionAccessModel, UpdateTransactionReimbursementTotalAccessRequest } from ".";

export interface ITransactionAccessService {
  /**
   * Crea una nueva transacción
   * @param request - Datos de la transacción a crear
   * @returns Promise con la transacción creada
   */
  create(request: CreateTransactionAccessRequest): Promise<TransactionAccessModel>;

  /**
   * Obtiene una transacción por ID
   * @param id - ID de la transacción
   * @returns Promise con la transacción encontrada o null
   */
  getById(id: number): Promise<TransactionAccessModel | null>;

  /**
   * Obtiene todas las transacciones de un usuario
   * @param userId - ID del usuario
   * @returns Promise con lista de transacciones
   */
  getByUserId(userId: number): Promise<TransactionAccessModel[]>;

  /**
   * Obtiene transacciones entre un usuario y un colaborador
   * @param userId - ID del usuario
   * @param collaboratorId - ID del colaborador
   * @returns Promise con lista de transacciones
   */
  getByUserAndCollaborator(userId: number, collaboratorId: number): Promise<TransactionAccessModel[]>;

  /**
   * Actualiza el total de reintegros de una transacción
   * @param request - Datos para actualizar el total de reintegros
   * @returns Promise<void>
   */
  updateReimbursementTotal(request: UpdateTransactionReimbursementTotalAccessRequest): Promise<void>;

  /**
   * Elimina una transacción
   * @param id - ID de la transacción a eliminar
   * @returns Promise<void>
   */
  delete(id: number): Promise<void>;
}