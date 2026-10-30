export interface TravelMemberApiModel {
  id: number;
  travelId: number;
  userId: number;
  collaboratorId: number;
  collaboratorName: string;
  collaboratorSurname: string;
  collaboratorEmail: string | null;
  joinedDate: Date;
  // Usuario real del miembro (null = sin cuenta vinculada: no ve el viaje)
  memberUserId: number | null;
}