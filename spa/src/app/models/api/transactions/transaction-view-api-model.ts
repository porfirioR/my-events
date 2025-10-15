import { CollaboratorInfoApiModel } from '..';
import { WhoPaid } from '../../enums';

export interface TransactionViewApiModel {
  id: number;
  description: string | null;
  totalAmount: number;
  totalReimbursement: number;
  netAmount: number;
  collaborator: CollaboratorInfoApiModel;
  whoPaid: WhoPaid;
  iPaid: number;
  iOwe: number;
  theyOwe: number;
  theyPaid: number;
  date: Date;
  isSettled: boolean;
  createdByMe: boolean;
}
