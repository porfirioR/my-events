export class AddOperationParticipantAccessRequest {
  constructor(
    public operationId: number,
    public travelMemberId: number,
    public shareAmount: number,
  ) {}
}