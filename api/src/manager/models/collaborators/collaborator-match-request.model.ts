import { MatchRequestStatus } from "../../../utility/enums";

export class CollaboratorMatchRequestModel {
  constructor(
    public id: number,
    public requesterUserId: number,
    public requesterCollaboratorId: number,
    public requesterCollaboratorName: string,
    public requesterCollaboratorSurname: string,
    public targetCollaboratorEmail: string,
    public status: MatchRequestStatus,
    public requestedDate: Date,
    public responseDate?: Date | null,
    public targetUserId?: number | null,
  ) { }
}