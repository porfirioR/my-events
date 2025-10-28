import { ReimbursementRequest, TransactionSplitRequest } from '.';
import { SplitType, WhoPaid } from '../../../utility/enums';

export class CreateTransactionRequest {
  constructor(
    public userId: number,
    public collaboratorId: number,
    public totalAmount: number,
    public description: string | null,
    public splitType: SplitType,
    public whoPaid: WhoPaid,
    public splits: TransactionSplitRequest[],
    public reimbursement: ReimbursementRequest | null
  ) {}
}
