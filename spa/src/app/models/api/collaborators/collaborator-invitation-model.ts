import { CollaboratorSummaryModel, ReceivedMatchRequestModel } from ".";

export interface CollaboratorInvitationModel {
  collaborator: CollaboratorSummaryModel;
  invitations: ReceivedMatchRequestModel[];
  invitationsCount: number;
}