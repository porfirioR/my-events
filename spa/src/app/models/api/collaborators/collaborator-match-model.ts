export interface CollaboratorMatchModel {
  id: number;
  collaboratorId: number;
  matchedCollaboratorId: number;
  matchedWithUserId: number;
  dateCreated: Date;
  collaboratorName?: string;
  collaboratorSurname?: string;
  matchedCollaboratorName?: string;
  matchedCollaboratorSurname?: string;
}