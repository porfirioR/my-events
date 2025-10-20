import { CreateTransactionReimbursementAccessRequest, TransactionReimbursementAccessModel } from ".";

export interface ITransactionReimbursementAccessService {
  /**
   * Crea un nuevo reintegro
   * @param request - Datos del reintegro a crear
   * @returns Promise con el reintegro creado
   */
  create(request: CreateTransactionReimbursementAccessRequest): Promise<TransactionReimbursementAccessModel>;

  /**
   * Obtiene todos los reintegros de una transacción
   * @param transactionId - ID de la transacción
   * @returns Promise con lista de reintegros
   */
  getByTransaction(transactionId: number): Promise<TransactionReimbursementAccessModel[]>;

  /**
   * Obtiene el total de reintegros de una transacción
   * @param transactionId - ID de la transacción
   * @returns Promise con el total de reintegros
   */
  getTotalByTransaction(transactionId: number): Promise<number>;

  /**
   * Elimina un reintegro
   * @param id - ID del reintegro a eliminar
   * @returns Promise<void>
   */
  delete(id: number): Promise<void>;
}