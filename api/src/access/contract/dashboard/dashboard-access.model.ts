export class DashboardAccessModel {
  constructor(
    public readonly collaborators: { total: number; active: number; inactive: number },
    public readonly transactions: { total: number; unsettled: number; settled: number },
    public readonly savingsGoals: { total: number; active: number; completed: number },
    public readonly travels: { total: number; active: number; finalized: number },
    public readonly loans: { total: number; active: number; completed: number },
  ) {}
}
