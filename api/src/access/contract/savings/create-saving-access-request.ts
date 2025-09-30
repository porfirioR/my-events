export class CreateSavingAccessRequest {
  constructor(
    public name: string,
    public description: string,
    public date: Date,
    public savingTypeId: number,
    public currencyId: number,
    public userId: number,
    public periodId?: number,
    public totalAmount?: number,
    public numberOfPayment?: number,
    public customPeriodQuantity?: number
  ) { }
}
