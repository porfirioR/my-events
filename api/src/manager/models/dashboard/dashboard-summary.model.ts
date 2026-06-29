export class ActiveGoalSummary {
  constructor(
    public id: number,
    public name: string,
    public currentAmount: number,
    public targetAmount: number,
    public currencyId: number,
    public progressionTypeId: number,
    public baseAmount: number | null,
    public numberOfInstallments: number | null,
  ) {}
}

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
      topActive: ActiveGoalSummary[];
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
