export class OperationCategoryEntity {
  public id: number;

  constructor(
    public name: string,
    public icon: string,
    public color: string,
    public isactive: boolean,
    public datecreated?: Date
  ) {}
}