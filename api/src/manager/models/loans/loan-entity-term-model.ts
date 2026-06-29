export class LoanEntityTermModel {
  constructor(
    public readonly id: number,
    public readonly loanEntityId: number,
    public readonly termMonths: number,
    public readonly annualRatePercentage: number,
  ) {}
}
