export class PaymentMethodEntity {
  public id?: number;

  constructor(
    public name: string,
    public datecreated?: Date,
  ) {}
}