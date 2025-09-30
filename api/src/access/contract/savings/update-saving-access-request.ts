import { CreateSavingAccessRequest } from "./create-saving-access-request";

export class UpdateSavingAccessRequest extends CreateSavingAccessRequest {
  constructor(
    public id: number,
    public isActive: boolean,
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
  ) {
    super(
      name,
      description,
      date,
      savingTypeId,
      currencyId,
      userId,
      periodId,
      totalAmount,
      numberOfPayment,
      customPeriodQuantity
    )
  }
}
