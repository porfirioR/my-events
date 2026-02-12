export class CreateInternalCollaboratorAccessRequest {
  constructor(
    public name: string,
    public surname: string,
    public email: string,
    public userId: number
  ) {}
}