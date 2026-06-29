export class ActiveGoalAccessModel {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly currentAmount: number,
    public readonly targetAmount: number,
    public readonly currencyId: number,
    public readonly progressionTypeId: number,
    public readonly baseAmount: number | null,
    public readonly numberOfInstallments: number | null,
  ) {}
}

export class DashboardAccessModel {
  constructor(
    public readonly collaborators: { total: number; active: number; inactive: number },
    public readonly transactions: { total: number; unsettled: number; settled: number },
    public readonly savingsGoals: { total: number; active: number; completed: number; topActive: ActiveGoalAccessModel[] },
    public readonly travels: { total: number; active: number; finalized: number },
    public readonly loans: { total: number; active: number; completed: number },
  ) {}
}
