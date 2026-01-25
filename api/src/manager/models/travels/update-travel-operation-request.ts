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
    public splitType: string,
    public transactionDate: Date,
    public participantMemberIds: number[], // IDs de los miembros que participan
    public categoryId: number,
  ) {}
}