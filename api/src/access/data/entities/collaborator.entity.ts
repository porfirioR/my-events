export class CollaboratorEntity {
  public id: number;

  constructor(
    public name: string,
    public surname: string,
    public email: string | null,
    public createdbyuserid: number,
    public isactive: boolean,
    public createddate?: Date
  ) {}
}
