export interface SavingsDepositApiModel {
  id: number;
  savingsGoalId: number;
  amount: number;
  depositDate: Date;
  installmentId: number | null;
  description: string | null;
}