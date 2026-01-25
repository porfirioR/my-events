export class UpdateTravelOperationAccessRequest {
  constructor(
    public id: number,
    public travelId: number,
    public currencyId: number,
    public paymentMethodId: number,
    public whoPaidMemberId: number,
    public amount: number,
    public description: string,
    public splitType: string,
    public transactionDate: Date,
    public lastUpdatedByUserId: number,
    public categoryId: number
  ) {}
}