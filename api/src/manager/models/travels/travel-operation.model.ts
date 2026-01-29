export class TravelOperationModel {
  constructor(
    public id: number,
    public travelId: number,
    public createdByUserId: number,
    public currencyId: number,
    public paymentMethodId: number,
    public whoPaidMemberId: number,
    public amount: number,
    public description: string,
    public participantType: string,
    public splitType: string,
    public status: string,
    public dateCreated: Date,
    public transactionDate: Date,
    public lastUpdatedByUserId: number | null,
    public updatedAt: Date | null,
    // Información enriquecida
    public currencySymbol?: string,
    public paymentMethodName?: string,
    public whoPaidMemberName?: string,
    public participantCount?: number,
    public approvalCount?: number,
    public pendingApprovalCount?: number,
  ) {}
}