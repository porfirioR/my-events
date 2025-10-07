export interface ReceivedMatchRequestModel {
  id: number;
  requesterUserId: number;
  requesterCollaboratorId: number;
  requesterUserEmail: string;
  requesterCollaboratorName: string;
  targetCollaboratorEmail: string;
  requestedDate: Date;
}