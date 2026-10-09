import { SplitType, WhoPaid } from '../enums'

// Quién pagó y cuánto le corresponde a cada uno al crear una transacción
export class TransactionSplitPlanViewModel {
  constructor(
    public whoPaid: WhoPaid,
    public splitType: SplitType,
    public mySplit: number,
    public theirSplit: number,
    public myPercentage?: number,
    public theirPercentage?: number
  ) { }
}
