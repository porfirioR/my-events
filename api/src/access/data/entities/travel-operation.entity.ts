export class TravelOperationEntity {
  public id?: number;
  // Entidad de la tarjeta o el banco con que se pagó (opcional)
  public paymentinstitutionid?: number | null;

  constructor(
    public travelid: number,
    public createdbyuserid: number,
    public currencyid: number,
    public paymentmethodid: number,
    public whopaidmemberid: number,
    public amount: number,
    public description: string,
    public participanttype: string,
    public splittype: string,
    public categoryid: number,
    public status: string,
    public datecreated?: Date,
    public transactiondate?: Date,
    public lastupdatedbyuserid?: number | null,
    public updatedat?: Date | null,
    public chargedamount?: number | null,
    public chargedcurrencyid?: number | null,
  ) {}
}