import { CreateCollaboratorRequest } from ".";

export class UpdateCollaboratorRequest extends CreateCollaboratorRequest {
  constructor(
    public id: number,
    name: string,
    surname: string,
    userId: number
  ) {
    super(name, surname, userId);
  }
}