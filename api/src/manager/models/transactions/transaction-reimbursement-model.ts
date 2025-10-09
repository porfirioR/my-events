export class TransactionReimbursementModel {
  constructor(
    public id: number,
    public transactionId: number,
    public amount: number,
    public description: string | null,
    public reimbursementDate: Date,
  ) {}
}