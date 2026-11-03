export class DebtsLoanModel {
  constructor(
    public loanId: number,
    public name: string,
    public institutionId: number,
    public institutionName: string | null,
    // A quién le debo / quién me debe (nombre libre o la entidad)
    public counterpartName: string | null,
    public currencyId: number,
    public currentBalance: number,
    public remainingInstallments: number,
    public nextDueDate: string | null,
    public nextAmount: number,
    public expectedEndDate: string | null,
    public overdueCount: number,
    public overdueAmount: number,
  ) {}
}

export class DebtsOverviewModel {
  constructor(
    public borrowed: DebtsLoanModel[],
    public lent: DebtsLoanModel[],
    // Por moneda: lo que debo, lo que me deben y la suma de las próximas cuotas de lo que debo
    public totals: { currencyId: number; borrowed: number; lent: number; monthlyCommitted: number }[],
  ) {}
}
