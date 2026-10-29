export class WithdrawSavingsGoalRequest {
  constructor(
    public readonly userId: number,
    public readonly savingsGoalId: number,
    public readonly payoutAmount: number | null,
    public readonly payoutDate: Date,
  ) {}
}
