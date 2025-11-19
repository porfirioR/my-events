export class SavingsGoalEntity {
  public id: number
  constructor(
    public userid: number,
    public currencyid: number,
    public name: string,
    public targetamount: number,
    public progressiontypeid: number,
    public statusid: number,
    public startdate: Date,
    public description?: string | null,
    public currentamount?: number,
    public numberofinstallments?: number | null,
    public baseamount?: number | null,
    public incrementamount?: number | null,
    public expectedenddate?: Date | null,
    public completeddate?: Date | null,
    public datecreated?: Date,
    public dateupdated?: Date,
  ) {}
}
