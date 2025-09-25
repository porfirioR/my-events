import { CreateCollaboratorRequest } from ".";

export class UpdateCollaboratorRequest extends CreateCollaboratorRequest {
  constructor(
    public id: number,
    name: string,
    surname: string,
    email: string | null,
    userId: number
  ) {
    super(name, surname, email, userId);
  }
}