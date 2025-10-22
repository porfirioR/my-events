import { SplitType, WhoPaid } from '../../../utility/enums';
import { TransactionAccessModel } from '../../../access/contract/transactions';
import { TransactionMatchInfoModel } from '.';

export class TransactionMatchModel extends TransactionAccessModel {
  constructor(
    id: number,
    userId: number,
    collaboratorId: number,
    totalAmount: number,
    description: string,
    splitType: SplitType,
    whoPaid: WhoPaid,
    totalReimbursement: number,
    netAmount: number,
    transactionDate: Date,
    public matchInfo?: TransactionMatchInfoModel
  ) {
    super(
      id,
      userId,
      collaboratorId,
      totalAmount,
      description,
      splitType,
      whoPaid,
      totalReimbursement,
      netAmount,
      transactionDate,
    );
  }
}
