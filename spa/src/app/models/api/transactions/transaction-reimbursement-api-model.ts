export interface TransactionReimbursementApiModel {
  id: number;
  transactionId: number;
  amount: number;
  description: string | null;
  reimbursementDate: Date;
}