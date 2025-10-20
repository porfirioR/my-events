export class CreateTransactionSplitAccessRequest {
  constructor(
    public transactionId: number,
    public collaboratorId: number | null,
    public userId: number | null,
    public amount: number,
    public sharePercentage: number | null,
    public isPayer: boolean,
  ) {}
}