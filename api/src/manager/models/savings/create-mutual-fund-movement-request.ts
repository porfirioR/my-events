export class CreateMutualFundMovementRequest {
  constructor(
    public readonly userId: number,
    public readonly savingsGoalId: number,
    public readonly amount: number,
    public readonly movementType: number,
    public readonly description?: string | null,
    public readonly date?: Date | null,
  ) {}
}
