import { TransactionSplitApiRequest } from ".";

export interface TransactionApiRequest {
  collaboratorId: number;
  totalAmount: number;
  description?: string;
  splitType: 'Equal' | 'Custom' | 'Percentage';
  whoPaid: 'user' | 'collaborator'; // ⭐ NUEVO
  splits: TransactionSplitApiRequest[];
  reimbursement?: ReimbursementApiRequest;
}