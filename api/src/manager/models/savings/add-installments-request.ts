export class AddInstallmentsRequest {
  constructor(
    public readonly userId: number,
    public readonly savingsGoalId: number,
    public readonly numberOfNewInstallments: number,
  ) {}
}