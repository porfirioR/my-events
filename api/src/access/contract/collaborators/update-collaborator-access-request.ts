export class UpdateCollaboratorAccessRequest {
  constructor(
    public id: number,
    public name: string,
    public surname: string,
    public email: string | null,
    public userId: number
  ) {}
}