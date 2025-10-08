export class UpdateTransactionReimbursementTotalAccessRequest {
  constructor(
    public transactionId: number,
    public totalReimbursement: number,
  ) {}
}