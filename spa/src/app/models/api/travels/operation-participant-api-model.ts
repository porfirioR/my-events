export interface OperationParticipantApiModel {
  memberId: number;
  memberName: string;
  memberSurname: string;
  shareAmount: number;
  sharePercentage: number;
  approvalStatus: 'Approved' | 'Pending' | 'Rejected';
}