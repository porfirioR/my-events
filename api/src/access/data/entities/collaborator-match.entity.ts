export class CollaboratorMatchEntity {
  public id: number

  constructor(
    public collaborator1id: number,
    public collaborator2id: number,
    public user1id: number,
    public user2id: number,
    public email: string,
    public datecreated?: Date,
  ) {}
}