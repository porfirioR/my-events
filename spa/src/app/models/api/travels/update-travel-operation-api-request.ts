import { SplitType, TravelParticipantType } from "../../enums";

export class UpdateTravelOperationApiRequest {
  constructor(
    public currencyId: number,
    public paymentMethodId: number,
    public whoPaidMemberId: number,
    public amount: number,
    public description: string,
    public participantType: TravelParticipantType,
    public splitType: SplitType,
    public transactionDate: Date,
    public participantMemberIds: number[],
    public categoryId: number
  ) {}
}