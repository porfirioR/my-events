export interface SavingsGoalApiModel {
  id: number;
  userId: number;
  currencyId: number;
  name: string;
  targetAmount: number;
  currentAmount: number;
  progressionTypeId: number;
  statusId: number;
  startDate: Date;
  description: string | null;
  numberOfInstallments: number | null;
  baseAmount: number | null;
  incrementAmount: number | null;
  expectedEndDate: Date | null;
  completedDate: Date | null;
  dateCreated: Date;
  dateUpdated: Date;
}
