import { CreateSavingsInstallmentAccessRequest } from './create-savings-installment-access-request';
import { SavingsInstallmentAccessModel } from './savings-installment-access.model';
import { UpdateSavingsInstallmentAccessRequest } from './update-savings-installment-access-request';

export interface ISavingsInstallmentAccessService {
  /**
   * Crea una nueva cuota de ahorro
   * @param accessRequest - Datos de la cuota a crear
   * @returns Promise con la cuota creada
   */
  create(accessRequest: CreateSavingsInstallmentAccessRequest): Promise<SavingsInstallmentAccessModel>;

  /**
   * Crea múltiples cuotas de ahorro en lote
   * @param accessRequests - Array de datos de cuotas a crear
   * @returns Promise con las cuotas creadas
   */
  createMany(accessRequests: CreateSavingsInstallmentAccessRequest[]): Promise<SavingsInstallmentAccessModel[]>;

  /**
   * Obtiene una cuota por ID
   * @param id - ID de la cuota
   * @returns Promise con la cuota encontrada
   */
  getById(id: number): Promise<SavingsInstallmentAccessModel>;

  /**
   * Obtiene todas las cuotas de un objetivo de ahorro
   * @param savingsGoalId - ID del objetivo de ahorro
   * @returns Promise con lista de cuotas ordenadas por número
   */
  getBySavingsGoalId(savingsGoalId: number): Promise<SavingsInstallmentAccessModel[]>;

  /**
   * Obtiene cuotas por estado de un objetivo
   * @param savingsGoalId - ID del objetivo de ahorro
   * @param statusId - ID del estado (1=Pending, 2=Paid, 3=Skipped)
   * @returns Promise con lista de cuotas filtradas
   */
  getByStatus(savingsGoalId: number, statusId: number): Promise<SavingsInstallmentAccessModel[]>;

  /**
   * Obtiene cuotas pendientes de un objetivo
   * @param savingsGoalId - ID del objetivo de ahorro
   * @returns Promise con lista de cuotas pendientes
   */
  getPendingInstallments(savingsGoalId: number): Promise<SavingsInstallmentAccessModel[]>;

  /**
   * Actualiza una cuota existente
   * @param accessRequest - Datos actualizados de la cuota
   * @returns Promise con la cuota actualizada
   */
  update(accessRequest: UpdateSavingsInstallmentAccessRequest): Promise<SavingsInstallmentAccessModel>;

  /**
   * Marca una cuota como pagada
   * @param id - ID de la cuota
   * @param paidDate - Fecha de pago
   * @returns Promise con la cuota actualizada
   */
  markAsPaid(id: number, paidDate: Date): Promise<SavingsInstallmentAccessModel>;

  /**
   * Marca una cuota como omitida
   * @param id - ID de la cuota
   * @returns Promise con la cuota actualizada
   */
  markAsSkipped(id: number): Promise<SavingsInstallmentAccessModel>;

  /**
   * Elimina una cuota
   * @param id - ID de la cuota
   * @returns Promise void
   */
  delete(id: number): Promise<void>;

  /**
   * Elimina todas las cuotas de un objetivo
   * @param savingsGoalId - ID del objetivo de ahorro
   * @returns Promise void
   */
  deleteAllBySavingsGoalId(savingsGoalId: number): Promise<void>;
}