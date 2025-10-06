export interface CollaboratorMatchModel {
  id: number;
  collaborator1Id: number;
  collaborator2Id: number;
  user1Id: number;
  user2Id: number;
  email: string;
  dateCreated: Date;
  // ⭐ AGREGAR: Propiedades calculadas/enriquecidas del backend
  collaboratorName?: string;
  collaboratorSurname?: string;
  matchedCollaboratorName?: string;
  matchedCollaboratorSurname?: string;
}