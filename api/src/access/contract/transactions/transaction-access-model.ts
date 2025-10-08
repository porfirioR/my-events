import { SplitType, WhoPaid } from "../../../utility/enums";

export class TransactionAccessModel {
  constructor(
    public id: number,
    public userId: number,
    public collaboratorId: number,
    public totalAmount: number,
    public description: string | null,
    public splitType: SplitType,
    public whoPaid: WhoPaid,
    public totalReimbursement: number,
    public netAmount: number,
    public transactionDate: Date,
  ) {}
}