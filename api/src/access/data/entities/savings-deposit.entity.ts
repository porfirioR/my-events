export class SavingsDepositEntity {
  public id: number;

  constructor(
    public savingsgoalid: number,
    public amount: number,
    public depositdate: Date,
    public installmentid?: number | null,
    public description?: string | null,
  ) {}
}