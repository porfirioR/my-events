export class CreateSavingsInstallmentAccessRequest {
  constructor(
    public readonly savingsGoalId: number,
    public readonly installmentNumber: number,
    public readonly amount: number,
    public readonly statusId: number = 1, // Default: Pending
    public readonly dueDate?: Date | null,
  ) {}
}