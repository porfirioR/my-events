export class CreateCollaboratorRequest {
  constructor(
    public name: string,
    public surname: string,
    public userId: number
  ) {}
}