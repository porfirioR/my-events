export class TravelOperationParticipantAccessModel {
  constructor(
    public id: number,
    public operationId: number,
    public travelMemberId: number,
    public shareAmount: number,
    public dateCreated: Date,
  ) {}
}