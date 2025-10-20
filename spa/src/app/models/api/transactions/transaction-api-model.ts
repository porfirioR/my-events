import { SplitType, WhoPaid } from '../../enums';

export interface TransactionApiModel {
  id: number;
  userId: number;
  collaboratorId: number;
  totalAmount: number;
  description: string | null;
  splitType: SplitType;
  whoPaid: WhoPaid;
  totalReimbursement: number;
  netAmount: number;
  transactionDate: Date;
}
