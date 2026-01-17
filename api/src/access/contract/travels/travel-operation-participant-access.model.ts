export class TravelOperationParticipantAccessModel {
  constructor(
    public operationId: number,
    public travelMemberId: number,
    public shareAmount: number,
    public id: number | null = null,
    public dateCreated: Date | null = null,
  ) {}
}