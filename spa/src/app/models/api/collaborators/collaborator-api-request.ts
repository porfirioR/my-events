export class CollaboratorApiRequest {
  constructor(
    public name: string,
    public surname: string,
    public email?: string | null,
    public id?: string | null,
  ) {}
}
