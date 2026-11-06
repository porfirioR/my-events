export class UpsertUserFinancialSettingsAccessRequest {
  constructor(
    public readonly userId: number,
    public readonly currencyId: number,
    public readonly monthlyNetIncome: number | null,
    public readonly monthlyEssentialExpense: number | null,
    public readonly cushionGreenMonths: number,
    public readonly cushionYellowMonths: number,
    public readonly savingsGreenPercentage: number,
    public readonly savingsYellowPercentage: number,
    public readonly debtGreenPercentage: number,
    public readonly debtYellowPercentage: number,
  ) {}
}
