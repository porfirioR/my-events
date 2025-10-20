export class TransactionSplitEntity {
  public id: number;

  constructor(
    public transactionid: number,
    public collaboratorid: number | null,
    public userid: number | null,
    public amount: number,
    public sharepercentage: number | null,
    public ispayer: boolean,
    public issettled: boolean,
  ) {}
}