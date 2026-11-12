// Patrón de descripción de MyMoney vinculado a una cuenta, un ahorro o un préstamo (#231)
export class MyMoneyDescriptionRuleModel {
  constructor(
    public readonly id: number,
    public readonly pattern: string,
    public readonly accountId: number | null,
    public readonly savingsGoalId: number | null,
    public readonly loanId: number | null,
  ) {}
}
