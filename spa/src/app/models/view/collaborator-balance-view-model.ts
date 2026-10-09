import { BalanceApiModel, TransactionViewApiModel } from '../api/transactions'
import { MonthlyBalanceSummaryViewModel } from './monthly-balance-summary-view-model'

export class CollaboratorBalanceViewModel {
  constructor(
    public balance: BalanceApiModel,
    public pendingCount: number,
    public lastMovementDate: Date | null,
    public oldestPendingDate: Date | null,
    // Porcentaje de la deuda mayor que ya está compensada por la menor
    public offsetPercentage: number,
    public theyOweShare: number,
    public months: MonthlyBalanceSummaryViewModel[],
    public recent: TransactionViewApiModel[]
  ) { }
}
