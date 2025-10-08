import { CollaboratorApiModel } from ".";

export interface EnrichedCollaboratorApiModel extends CollaboratorApiModel {
  pendingInvitations: number;
  acceptedMatches: number;
  totalInvitations: number;
}