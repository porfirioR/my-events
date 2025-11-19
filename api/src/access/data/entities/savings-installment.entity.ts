export class SavingsInstallmentEntity {
  public id: number;

  constructor(
    public savingsgoalid: number,
    public installmentnumber: number,
    public amount: number,
    public statusid: number,
    public duedate?: Date | null,
    public paiddate?: Date | null,
    public datecreated?: Date,
  ) {}
}