export class MonthlyBalanceSummaryViewModel {
  constructor(
    public key: string,
    public date: Date,
    public theyOwe: number = 0,
    public iOwe: number = 0
  ) { }

  public get net(): number {
    return this.theyOwe - this.iOwe
  }
}
