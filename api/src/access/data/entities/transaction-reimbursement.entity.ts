export class TransactionReimbursementEntity {
  public id: number;

  constructor(
    public transactionid: number,
    public amount: number,
    public description: string | null,
    public reimbursementdate?: Date,
  ) {}
}