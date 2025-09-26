import { CreateCollaboratorApiRequest } from "./create-collaborator-api-request";

export interface UpdateCollaboratorApiRequest extends CreateCollaboratorApiRequest {
  id: number;
}