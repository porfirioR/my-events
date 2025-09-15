import { CreateCollaboratorApiRequest } from "./create-collaborator-api-request";

export type UpdateCollaboratorApiRequest = Omit<CreateCollaboratorApiRequest, 'createdByUserId'> & {
  id: number;
}