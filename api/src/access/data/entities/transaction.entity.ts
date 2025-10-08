export class TransactionEntity {
  public id: number;

  constructor(
    public userid: number,
    public collaboratorid: number,
    public totalamount: number,
    public description: string | null,
    public splittype: string,
    public whopaid: string,
    public totalreimbursement: number,
    public transactiondate?: Date,
  ) {}
}