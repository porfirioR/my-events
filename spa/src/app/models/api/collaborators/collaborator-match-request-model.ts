export interface CollaboratorMatchRequestModel {
  id: number;
  collaboratorId: number;
  targetEmail: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  dateCreated: Date;
  dateUpdated: Date;
  collaboratorName?: string;
  collaboratorSurname?: string;
}