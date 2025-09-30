import { CreateEventApiRequest } from "..";

export class UpdateEventApiRequest implements Omit<CreateEventApiRequest, 'authorId'> {
  constructor(
    public id: number,
    public name: string,
    public description: string,
    public date: Date,
    public isPublic: boolean
  ) { }
}