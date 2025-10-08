export class CollaboratorSummaryModel {
  constructor(
    public id: number,
    public name: string,
    public surname: string,
    public email: string | null
  ) {}
}