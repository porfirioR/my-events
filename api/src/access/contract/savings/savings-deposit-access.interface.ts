import { CreateSavingsDepositAccessRequest } from './create-savings-deposit-access-request';
import { SavingsDepositAccessModel } from './savings-deposit-access.model';

export interface ISavingsDepositAccessService {
  /**
   * Crea un nuevo depósito de ahorro
   * @param accessRequest - Datos del depósito a crear
   * @returns Promise con el depósito creado
   */
  create(accessRequest: CreateSavingsDepositAccessRequest): Promise<SavingsDepositAccessModel>;

  /**
   * Obtiene un depósito por ID
   * @param id - ID del depósito
   * @returns Promise con el depósito encontrado
   */
  getById(id: number): Promise<SavingsDepositAccessModel>;

  /**
   * Obtiene todos los depósitos de un objetivo de ahorro
   * @param savingsGoalId - ID del objetivo de ahorro
   * @returns Promise con lista de depósitos ordenados por fecha descendente
   */
  getBySavingsGoalId(savingsGoalId: number): Promise<SavingsDepositAccessModel[]>;

  /**
   * Obtiene depósitos asociados a una cuota específica
   * @param installmentId - ID de la cuota
   * @returns Promise con lista de depósitos
   */
  getByInstallmentId(installmentId: number): Promise<SavingsDepositAccessModel[]>;

  /**
   * Obtiene depósitos libres (sin cuota asociada) de un objetivo
   * @param savingsGoalId - ID del objetivo de ahorro
   * @returns Promise con lista de depósitos libres
   */
  getFreeFormDeposits(savingsGoalId: number): Promise<SavingsDepositAccessModel[]>;

  /**
   * Obtiene el total depositado en un objetivo
   * @param savingsGoalId - ID del objetivo de ahorro
   * @returns Promise con el monto total depositado
   */
  getTotalDepositedAmount(savingsGoalId: number): Promise<number>;

  /**
   * Elimina un depósito
   * @param id - ID del depósito
   * @returns Promise void
   */
  delete(id: number): Promise<void>;
}