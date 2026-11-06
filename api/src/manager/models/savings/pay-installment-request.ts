export class PayInstallmentRequest {
  constructor(
    public readonly userId: number,
    public readonly savingsGoalId: number,
    public readonly installmentId: number,
    public readonly amount: number,
    public readonly description?: string | null,
    public readonly accountId: number | null = null,
  ) {}
}