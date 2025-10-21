import { CollaboratorSummaryApiModel, ReceivedMatchRequestModel } from ".";

export interface CollaboratorInvitationModel {
  collaborator: CollaboratorSummaryApiModel;
  invitations: ReceivedMatchRequestModel[];
  invitationsCount: number;
}