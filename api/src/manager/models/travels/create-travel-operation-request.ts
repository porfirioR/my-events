export class CreateTravelOperationRequest {
  constructor(
    public userId: number,
    public travelId: number,
    public currencyId: number,
    public paymentMethodId: number,
    public whoPaidMemberId: number,
    public amount: number,
    public description: string,
    public participantType: string, // 'All' or 'Selected'
    public splitType: string, // 'Equal' | 'Custom' | 'Percentage'
    public transactionDate: Date,
    public categoryId: number,
    public participantMemberIds: number[], // IDs de los miembros que participan // Solo usado si participantType === 'Selected'
    public customAmounts?: number[],        //Para splitType === 'Custom'
    public customPercentages?: number[],    //Para splitType === 'Percentage'
  ) {}
}