export class OperationParticipantModel {
  constructor(
    public memberId: number,
    public memberName: string,
    public memberSurname: string,
    public shareAmount: number,
    public sharePercentage: number,
    public approvalStatus: string, // 'Approved', 'Pending', 'Rejected'
  ) {}
}