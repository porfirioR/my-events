export class EventEntity {
  public id: number
  constructor(
    public name: string,
    public authorid: number,
    public description: string,
    public isactive: boolean,
    public date: Date,
    public ispublic: boolean
  ) {}
}
