import { CollaboratorSummaryModel, ReceivedMatchRequestModel } from ".";

export class InvitationSummaryModel {
  constructor(
    public collaborator: CollaboratorSummaryModel,
    public invitations: ReceivedMatchRequestModel[],
    public invitationsCount: number,
  ) {}
}