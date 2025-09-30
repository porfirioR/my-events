export interface CreateCollaboratorApiRequest {
  name: string;
  surname: string;
  email?: string | null;
}