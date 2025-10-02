export interface ReceivedMatchRequestModel {
  id: number;
  senderUserId: number;
  senderCollaboratorId: number;
  receiverEmail: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  dateCreated: Date;
  dateUpdated: Date;
  senderCollaboratorName: string;
  senderCollaboratorSurname: string;
  senderUserEmail?: string;
}