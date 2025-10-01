/**
 * Modelo de solicitud de matching recibida
 */
export class ReceivedMatchRequestModel {
  constructor(
    public id: number,
    public requesterUserId: number,
    public requesterCollaboratorId: number,
    public requesterCollaboratorName: string,
    public targetCollaboratorEmail: string,
    public requestedDate: Date
  ) {}
}