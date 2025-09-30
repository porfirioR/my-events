export class CollaboratorMatchRequestEntity {
  public id: number;

  constructor(
    public requesteruserid: number,
    public requestercollaboratorid: number,
    public targetuserid: number,
    public targetcollaboratoremail: string,
    public status: string,
    public requesteddate?: Date,
    public responsedate?: Date | null,
  ) {}
}