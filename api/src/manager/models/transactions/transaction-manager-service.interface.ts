import { AddReimbursementRequest, BalanceModel, CreateTransactionRequest, TransactionModel, TransactionReimbursementModel, TransactionViewModel } from ".";

export interface ITransactionManagerService {
  /**
   * Crea una nueva transacción con sus splits y reintegro opcional
   * @param request - Datos completos de la transacción
   * @returns Promise con la transacción creada
   * @throws ValidationError si los datos no son válidos
   */
  createTransaction(request: CreateTransactionRequest): Promise<TransactionModel>;

  /**
   * Agrega un reintegro a una transacción existente
   * @param request - Datos del reintegro a agregar
   * @returns Promise con el reintegro creado
   * @throws ValidationError si el reintegro excede el monto total
   * @throws NotFoundException si la transacción no existe
   */
  addReimbursement(request: AddReimbursementRequest): Promise<TransactionReimbursementModel>;

  /**
   * Obtiene una transacción por ID
   * @param id - ID de la transacción
   * @returns Promise con la transacción encontrada
   * @throws NotFoundException si la transacción no existe
   */
  getTransactionById(id: number): Promise<TransactionModel>;

  /**
   * Obtiene todas las transacciones del usuario (propias y de matches)
   * @param userId - ID del usuario
   * @returns Promise con lista de vistas de transacciones
   */
  getMyTransactions(userId: number): Promise<TransactionViewModel[]>;

  /**
   * Calcula el balance entre un usuario y un colaborador
   * @param userId - ID del usuario
   * @param collaboratorId - ID del colaborador
   * @returns Promise con el balance calculado
   */
  getBalanceWithCollaborator(userId: number, collaboratorId: number): Promise<BalanceModel>;

  /**
   * Obtiene todos los balances del usuario con sus colaboradores
   * @param userId - ID del usuario
   * @returns Promise con lista de balances
   */
  getAllBalances(userId: number): Promise<BalanceModel[]>;

  /**
   * Elimina una transacción
   * @param id - ID de la transacción a eliminar
   * @returns Promise<void>
   */
  deleteTransaction(id: number): Promise<void>;

  
  /**
   * Marca un split como liquidado
   * @param id - ID del split
   * @returns Promise<void>
   */
  settleTransaction(transactionId: number): Promise<void>;
}