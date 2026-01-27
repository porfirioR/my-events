export class UpdateTravelOperationApiRequest {
  constructor(
    public currencyId: number,
    public paymentMethodId: number,
    public whoPaidMemberId: number,
    public amount: number,
    public description: string,
    public splitType: string,
    public transactionDate: Date,
    public participantMemberIds: number[],
    public categoryId: number
  ) {}
}