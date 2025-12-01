export class CreateSavingsDepositAccessRequest {
  constructor(
    public readonly savingsGoalId: number,
    public readonly amount: number,
    public readonly depositDate: Date = new Date(),
    public readonly installmentId?: number | null,
    public readonly description?: string | null,
  ) {}
}