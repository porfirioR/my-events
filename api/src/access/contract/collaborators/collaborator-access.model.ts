export class CollaboratorAccessModel {
  constructor(
    public id: number,
    public name: string,
    public surname: string,
    public email: string | null,
    public createdByUserId: number,
    public isActive: boolean,
    public createdDate: Date,
    public type: 'INTERNAL' | 'EXTERNAL'
  ) {}
}