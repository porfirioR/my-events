export class CollaboratorMatchModel {
  constructor(
    public id: number,
    public collaborator1Id: number,
    public collaborator2Id: number,
    public user1Id: number,
    public user2Id: number,
    public dateCreated: Date,
    public collaboratorName?: string,
    public collaboratorSurname?: string,
    public matchedCollaboratorName?: string,
    public matchedCollaboratorSurname?: string,
  ) { }
}