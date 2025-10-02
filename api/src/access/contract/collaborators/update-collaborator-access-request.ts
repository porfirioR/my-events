export class UpdateCollaboratorAccessRequest {
  constructor(
    public id: number,
    public name: string,
    public surname: string,
    public userId: number
  ) {}
}