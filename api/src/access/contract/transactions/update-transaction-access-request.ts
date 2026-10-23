import { SplitType, WhoPaid } from "../../../utility/enums";
import { CreateTransactionSplitAccessRequest } from "./create-transaction-split-access-request";

export class UpdateTransactionAccessRequest {
  constructor(
    public id: number,
    public collaboratorId: number,
    public totalAmount: number,
    public description: string | null,
    public splitType: SplitType,
    public whoPaid: WhoPaid,
    // Fecha sin hora (YYYY-MM-DD); null conserva la fecha actual
    public transactionDate: string | null,
    // false conserva los reintegros existentes (cuando hay más de uno)
    public replaceReimbursement: boolean,
    public reimbursementAmount: number,
    public reimbursementDescription: string | null,
    public splits: CreateTransactionSplitAccessRequest[],
  ) {}
}
