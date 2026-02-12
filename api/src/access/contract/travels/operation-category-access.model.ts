export class OperationCategoryAccessModel {
  constructor(
    public id: number,
    public name: string,
    public icon: string,
    public color: string,
    public isActive: boolean,
    public dateCreated: Date,
  ) {}
}