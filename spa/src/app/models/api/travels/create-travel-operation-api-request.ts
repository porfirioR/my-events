export class CreateTravelOperationApiRequest {
  constructor(
    public currencyId: number,
    public paymentMethodId: number,
    public whoPaidMemberId: number,
    public amount: number,
    public description: string,
    public splitType: string,
    public transactionDate: string,
    public participantMemberIds: number[]
  ) {}
}