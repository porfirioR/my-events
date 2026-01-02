import { PaymentMethodAccessModel } from '.';

export interface IPaymentMethodAccessService {
  /**
   * Obtener todos los métodos de pago
   */
  getAll(): Promise<PaymentMethodAccessModel[]>;

  /**
   * Obtener método de pago por ID
   */
  getById(id: number): Promise<PaymentMethodAccessModel | null>;
}
