export class SavingsDepositAccessModel {
  constructor(
    public readonly id: number,
    public readonly savingsGoalId: number,
    public readonly amount: number,
    public readonly depositDate: Date,
    public readonly installmentId: number | null,
    public readonly description: string | null,
  ) {}
}