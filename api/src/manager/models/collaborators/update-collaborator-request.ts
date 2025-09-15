export class UpdateCollaboratorRequest {
  constructor(
    public id: number,
    public name: string,
    public surname: string,
    public email: string | null,
    public createdByUserId: number
  ) {}
}