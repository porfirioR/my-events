import { CreateCollaboratorApiRequest } from "./create-collaborator-api-request";

export type UpdateCollaboratorApiRequest = Omit<CreateCollaboratorApiRequest, 'userId'> & {
  id: number;
}