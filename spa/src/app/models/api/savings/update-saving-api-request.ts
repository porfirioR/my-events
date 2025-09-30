import { CreateSavingApiRequest } from "./create-saving-api-request";

export class UpdateSavingApiRequest extends CreateSavingApiRequest {
  constructor(
    public id: number,
    public isActive: boolean,
    name: string,
    description: string,
    date: Date,
    savingTypeId: number,
    currencyId: number,
    userid: number,
    periodId?: number,
    totalAmount?: number,
    numberOfPayment?: number,
  ) {
    super(
      name,
      description,
      date,
      savingTypeId,
      currencyId,
      userid,
      periodId,
      totalAmount,
      numberOfPayment
    )
  }
}