import { MatchRequestStatus } from "../../enums";

export interface CollaboratorMatchRequestModel {
  id: number;
  requesterUserId: number;
  requesterCollaboratorId: number;
  requesterCollaboratorName: string;
  requesterCollaboratorSurname: string;
  targetCollaboratorEmail: string;
  status: MatchRequestStatus;
  requestedDate: Date;
  responseDate?: Date;
  targetUserId?: number;
}