export class SavingsProgrammedTermModel {
  constructor(
    public readonly id: number,
    public readonly termMonths: number,
    public readonly annualRatePercentage: number,
  ) {}
}
