export interface SavingsInstallmentApiModel {
  id: number;
  savingsGoalId: number;
  installmentNumber: number;
  amount: number;
  statusId: number;
  dueDate: Date | null;
  paidDate: Date | null;
  dateCreated: Date;
}