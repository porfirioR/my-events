export class SavingsInstallmentModel {
  constructor(
    public readonly id: number,
    public readonly savingsGoalId: number,
    public readonly installmentNumber: number,
    public readonly amount: number,
    public readonly statusId: number,
    public readonly dueDate: Date | null,
    public readonly paidDate: Date | null,
    public readonly dateCreated: Date,
  ) {}
}