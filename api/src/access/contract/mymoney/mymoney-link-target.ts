// Cuenta, ahorro o préstamo al que se vincula una categoría o un patrón de descripción (a lo sumo uno)
export class MyMoneyLinkTarget {
  constructor(
    public readonly accountId: number | null,
    public readonly savingsGoalId: number | null,
    public readonly loanId: number | null,
  ) {}
}
