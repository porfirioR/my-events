export interface TransactionRequest {
  userId: number;
  collaboratorId: number;
  totalAmount: number;
  description?: string;
  splitType: SplitType;
  whoPaid: 'user' | 'collaborator'; // ⭐ NUEVO
  splits: TransactionSplitRequest[];
  reimbursement?: ReimbursementRequest;
}