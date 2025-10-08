import { SplitType, WhoPaid } from "../../../utility/enums";

export class CreateTransactionAccessRequest {
  constructor(
    public userId: number,
    public collaboratorId: number,
    public totalAmount: number,
    public description: string | null,
    public splitType: SplitType,
    public whoPaid: WhoPaid,
    public totalReimbursement: number,
  ) {}
}