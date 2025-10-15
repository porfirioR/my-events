import { ReimbursementApiRequest, TransactionSplitApiRequest } from '.';
import { SplitType, WhoPaid } from '../../enums';

export class CreateTransactionApiRequest {
  constructor(
    public collaboratorId: number,
    public totalAmount: number,
    public description: string | null,
    public splitType: SplitType,
    public whoPaid: WhoPaid,
    public splits: TransactionSplitApiRequest[],
    public reimbursement?: ReimbursementApiRequest | null
  ) {}
}
