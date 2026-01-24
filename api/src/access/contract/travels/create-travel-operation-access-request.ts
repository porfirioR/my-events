export class CreateTravelOperationAccessRequest {
  constructor(
    public travelId: number,
    public createdByUserId: number,
    public currencyId: number,
    public paymentMethodId: number,
    public whoPaidMemberId: number,
    public amount: number,
    public description: string,
    public splitType: string,
    public transactionDate: Date,
    public categoryId?: number,
  ) {}
}