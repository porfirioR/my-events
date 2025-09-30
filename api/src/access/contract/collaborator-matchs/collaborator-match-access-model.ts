export class CollaboratorMatchAccessModel {
  constructor(
    public id: number,
    public collaborator1Id: number,
    public collaborator2Id: number,
    public user1Id: number,
    public user2Id: number,
    public email: string,
    public createdDate: Date,
  ) { }
}
