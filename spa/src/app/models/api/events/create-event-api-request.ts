export class CreateEventApiRequest {
  constructor(
    public name: string,
    public authorId: number,
    public description: string,
    public date: Date,
    public isPublic: boolean
  ) {}
}