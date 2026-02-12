export class UpdateTravelOperationRequest {
  constructor(
    public userId: number,
    public operationId: number,
    public travelId: number,
    public currencyId: number,
    public paymentMethodId: number,
    public whoPaidMemberId: number,
    public amount: number,
    public description: string,
    public participantType: string,
    public splitType: string,
    public transactionDate: Date,
    public categoryId: number,
    public participantMemberIds: number[], // IDs de los miembros que participan
    public customAmounts?: number[],
    public customPercentages?: number[],
  ) {}
}