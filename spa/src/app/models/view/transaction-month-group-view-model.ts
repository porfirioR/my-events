import { TransactionViewApiModel } from '../api/transactions'

// Transacciones de un mes con sus totales, para la lista agrupada
export class TransactionMonthGroupViewModel {
  constructor(
    public key: string,
    public date: Date,
    public transactions: TransactionViewApiModel[] = []
  ) { }

  /**
   * La otra persona cubrió el 100% de mi parte (un pago, o un gasto mío que pagó ella).
   * En ese caso iOwe y theyPaid son la misma plata: se muestra solo como "Recibí".
   */
  public static isReceived(transaction: TransactionViewApiModel): boolean {
    return transaction.theyPaid > 0 && transaction.iOwe > 0 && Math.abs(transaction.iOwe - transaction.netAmount) < 0.01
  }

  public get theyOwe(): number {
    return this.transactions.reduce((sum, x) => sum + x.theyOwe, 0)
  }

  // Lo que la otra persona me pagó o cubrió por completo
  public get received(): number {
    return this.transactions
      .filter(x => TransactionMonthGroupViewModel.isReceived(x))
      .reduce((sum, x) => sum + x.iOwe, 0)
  }

  // Mi parte de gastos compartidos que pagó la otra persona
  public get iOwe(): number {
    return this.transactions
      .filter(x => !TransactionMonthGroupViewModel.isReceived(x))
      .reduce((sum, x) => sum + x.iOwe, 0)
  }

  public get reimbursements(): number {
    return this.transactions.reduce((sum, x) => sum + x.totalReimbursement, 0)
  }

  // Cada monto se cuenta una sola vez: lo que me deben menos lo recibido y lo que debo
  public get net(): number {
    return this.theyOwe - this.received - this.iOwe
  }
}
