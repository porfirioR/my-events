export class CreateMatchAccessRequest {
  constructor(
    public collaborator1Id: number,
    public collaborator2Id: number,
    public user1Id: number,
    public user2Id: number,
  ) { }
}