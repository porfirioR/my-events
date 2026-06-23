export class LoanEntityTermApiModel {
  constructor(
    public id: number,
    public loanEntityId: number,
    public termMonths: number,
    public annualRatePercentage: number,
  ) {}
}
