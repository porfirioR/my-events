export class CollaboratorModel {
  constructor(
    public id: number,
    public name: string,
    public surname: string,
    public email: string | null,
    public userId: number,
    public isActive: boolean,
    public createdDate: Date,
    public type: 'INTERNAL' | 'EXTERNAL'
  ) {}
}