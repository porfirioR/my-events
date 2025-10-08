export class CreateTransactionReimbursementAccessRequest {
  constructor(
    public transactionId: number,
    public amount: number,
    public description: string | null,
  ) {}
}