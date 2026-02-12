import { OperationCategoryAccessModel } from ".";

export interface IOperationCategoryAccessService {
  /**
   * Obtener todas las categorías activas
   */
  getAll(): Promise<OperationCategoryAccessModel[]>;

  /**
   * Obtener categoría por ID
   */
  getById(id: number): Promise<OperationCategoryAccessModel | null>;

  /**
   * Obtener categorías activas
   */
  getActive(): Promise<OperationCategoryAccessModel[]>;
}