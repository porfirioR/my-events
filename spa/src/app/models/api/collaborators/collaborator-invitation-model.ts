export interface CollaboratorInvitationModel {
  collaboratorId: number;
  collaboratorName: string;
  collaboratorSurname: string;
  pendingCount: number;
  acceptedCount: number;
  rejectedCount: number;
  totalCount: number;
}