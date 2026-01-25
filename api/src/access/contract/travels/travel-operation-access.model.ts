export class TravelOperationAccessModel {
  constructor(
    public id: number,
    public travelId: number,
    public createdByUserId: number,
    public currencyId: number,
    public paymentMethodId: number,
    public whoPaidMemberId: number,
    public amount: number,
    public description: string,
    public splitType: string,
    public status: string,
    public dateCreated: Date,
    public transactionDate: Date,
    public lastUpdatedByUserId: number | null,
    public updatedAt: Date | null,
    public categoryId: number
  ) {}
}