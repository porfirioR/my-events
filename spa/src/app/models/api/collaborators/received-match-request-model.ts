export interface ReceivedMatchRequestModel {
  id: number;
  requesterUserId: number;
  requesterCollaboratorId: number;
  requesterCollaboratorName: string;
  targetCollaboratorEmail: string;
  requestedDate: Date;
}