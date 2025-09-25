export class CollaboratorApiRequest {
  constructor(
    public name: string,
    public surname: string,
    public userId: number,
    public email?: string | null,
  ) {}
}
