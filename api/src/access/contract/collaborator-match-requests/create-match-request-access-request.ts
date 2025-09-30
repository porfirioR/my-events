export class CreateMatchRequestAccessRequest {
  constructor(
    public requesterUserId: number,
    public requesterCollaboratorId: number,
    public targetUserId: number,
    public targetCollaboratorEmail: string,
  ) { }
}