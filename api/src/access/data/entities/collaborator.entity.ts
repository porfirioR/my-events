export class CollaboratorEntity {
  public id: number;

  constructor(
    public name: string,
    public surname: string,
    public email: string | null,
    public userid: number,
    public isactive: boolean,
    public datecreated?: Date
  ) {}
}
