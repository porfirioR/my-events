export class CreateCollaboratorAccessRequest {
  constructor(
    public name: string,
    public surname: string,
    public userId: number
  ) {}
}