export class TravelMemberModel {
  constructor(
    public id: number,
    public travelId: number,
    public userId: number,           // ← userId real del collaborator (para notificar)
    public collaboratorId: number,   // ← Collaborator del creador
    public collaboratorName: string,
    public collaboratorSurname: string,
    public collaboratorEmail: string | null,
    public joinedDate: Date,
    public source?: 'MyCollaborator' | 'CreatorCollaborator' | 'Me',  // ✅ NUEVO
    public canAddToMyCollaborators?: boolean,                          // ✅ NUEVO
  ) {}
}