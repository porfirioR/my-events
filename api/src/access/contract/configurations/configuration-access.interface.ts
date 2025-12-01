import { CurrencyAccessModel, InstallmentStatusAccessModel, SavingsProgressionTypeAccessModel, SavingsStatusAccessModel } from ".";


export interface IConfigurationAccessService {
  /**
   * Obtiene todos los tipos de progresión de ahorro
   * @returns Promise con lista de tipos de progresión
   */
  getSavingsProgressionTypes(): Promise<SavingsProgressionTypeAccessModel[]>;

  /**
   * Obtiene un tipo de progresión por ID
   * @param id - ID del tipo de progresión
   * @returns Promise con el tipo de progresión encontrado
   */
  getSavingsProgressionTypeById(id: number): Promise<SavingsProgressionTypeAccessModel>;

  /**
   * Obtiene todos los estados de objetivos de ahorro
   * @returns Promise con lista de estados
   */
  getSavingsStatuses(): Promise<SavingsStatusAccessModel[]>;

  /**
   * Obtiene un estado de objetivo por ID
   * @param id - ID del estado
   * @returns Promise con el estado encontrado
   */
  getSavingsStatusById(id: number): Promise<SavingsStatusAccessModel>;

  /**
   * Obtiene todos los estados de cuotas
   * @returns Promise con lista de estados de cuotas
   */
  getInstallmentStatuses(): Promise<InstallmentStatusAccessModel[]>;

  /**
   * Obtiene un estado de cuota por ID
   * @param id - ID del estado
   * @returns Promise con el estado encontrado
   */
  getInstallmentStatusById(id: number): Promise<InstallmentStatusAccessModel>;

  /**
   * Obtiene todas las monedas disponibles
   * @returns Promise con lista de monedas
   */
  getCurrencies(): Promise<CurrencyAccessModel[]>;

  /**
   * Obtiene una moneda por ID
   * @param id - ID de la moneda
   * @returns Promise con la moneda encontrada
   */
  getCurrencyById(id: number): Promise<CurrencyAccessModel>;
}