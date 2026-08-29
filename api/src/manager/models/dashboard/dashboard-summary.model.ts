export class DashboardSummaryModel {
  constructor(
    public collaborators: {
      total: number;
      active: number;
      inactive: number;
    },
    public transactions: {
      total: number;
      unsettled: number;
      settled: number;
    },
    public savingsGoals: {
      total: number;
      active: number;
      completed: number;
    },
    public travels: {
      total: number;
      active: number;
      finalized: number;
    },
    public loans: {
      total: number;
      active: number;
      completed: number;
    },
  ) {}
}
