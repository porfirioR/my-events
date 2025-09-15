export class CreateCollaboratorRequest {
  constructor(
    public name: string,
    public surname: string,
    public email: string | null,
    public createdByUserId: number
  ) {}
}