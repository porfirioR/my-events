import { CreateSavingsGoalAccessRequest } from './create-savings-goal-access-request';
import { SavingsGoalAccessModel } from './savings-goal-access.model';
import { UpdateSavingsGoalAccessRequest } from './update-savings-goal-access-request';

export interface ISavingsGoalAccessService {
  /**
   * Crea un nuevo objetivo de ahorro
   * @param accessRequest - Datos del objetivo a crear
   * @returns Promise con el objetivo creado
   */
  create(accessRequest: CreateSavingsGoalAccessRequest): Promise<SavingsGoalAccessModel>;

  /**
   * Obtiene un objetivo de ahorro por ID
   * @param id - ID del objetivo
   * @param userId - ID del usuario propietario
   * @returns Promise con el objetivo encontrado
   * @throws Error si el objetivo no existe o no pertenece al usuario
   */
  getById(id: number, userId: number): Promise<SavingsGoalAccessModel>;

  /**
   * Obtiene todos los objetivos de ahorro de un usuario
   * @param userId - ID del usuario propietario
   * @returns Promise con lista de objetivos
   */
  getAll(userId: number): Promise<SavingsGoalAccessModel[]>;

  /**
   * Obtiene objetivos de ahorro por estado
   * @param userId - ID del usuario propietario
   * @param statusId - ID del estado (1=Active, 2=Completed, 3=Paused, 4=Cancelled)
   * @returns Promise con lista de objetivos filtrados
   */
  getByStatus(userId: number, statusId: number): Promise<SavingsGoalAccessModel[]>;

  /**
   * Actualiza un objetivo de ahorro existente
   * @param accessRequest - Datos actualizados del objetivo
   * @returns Promise con el objetivo actualizado
   */
  update(accessRequest: UpdateSavingsGoalAccessRequest): Promise<SavingsGoalAccessModel>;

  /**
   * Actualiza el monto actual de un objetivo
   * @param id - ID del objetivo
   * @param userId - ID del usuario propietario
   * @param newAmount - Nuevo monto acumulado
   * @returns Promise con el objetivo actualizado
   */
  updateCurrentAmount(id: number, userId: number, newAmount: number): Promise<SavingsGoalAccessModel>;

  /**
   * Actualiza el estado de un objetivo
   * @param id - ID del objetivo
   * @param userId - ID del usuario propietario
   * @param statusId - Nuevo ID de estado
   * @returns Promise con el objetivo actualizado
   */
  updateStatus(id: number, userId: number, statusId: number): Promise<SavingsGoalAccessModel>;

  /**
   * Marca un objetivo como completado
   * @param id - ID del objetivo
   * @param userId - ID del usuario propietario
   * @returns Promise con el objetivo actualizado
   */
  markAsCompleted(id: number, userId: number): Promise<SavingsGoalAccessModel>;

  /**
   * Elimina un objetivo de ahorro
   * @param id - ID del objetivo
   * @param userId - ID del usuario propietario
   * @returns Promise void
   */
  delete(id: number, userId: number): Promise<void>;

  /**
   * Obtiene estadísticas de objetivos de ahorro de un usuario
   * @param userId - ID del usuario propietario
   * @returns Promise con estadísticas (total, activos, completados, etc.)
   */
  getStats(userId: number): Promise<{
    total: number;
    active: number;
    completed: number;
    paused: number;
    cancelled: number;
  }>;
}