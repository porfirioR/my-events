export class PaymentEntity {
  public id: number
  constructor(
    public date: Date,
    public savingid: number,
    public amount: number,
    public refund: boolean
  ) {}
}