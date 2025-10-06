import { MatchRequestStatus } from "../../../enums";

export interface CollaboratorMatchRequestModel {
  id: number;
  requesterUserId: number;
  requesterCollaboratorId: number;
  targetCollaboratorEmail: string;
  status: MatchRequestStatus;
  requestedDate: Date;
  responseDate?: Date;
  targetUserId?: number;
}