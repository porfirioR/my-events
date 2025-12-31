export class TravelOperationEntity {
  public id?: number;

  constructor(
    public travelid: number,
    public createdbyuserid: number,
    public currencyid: number,
    public paymentmethodid: number,
    public whopaidmemberid: number,
    public amount: number,
    public description: string,
    public splittype: string,
    public status: string,
    public datecreated?: Date,
    public transactiondate?: Date,
    public lastupdatedbyuserid?: number | null,
    public updatedat?: Date | null,
  ) {}
}