export class TravelMemberModel {
  constructor(
    public id: number,
    public travelId: number,
    public userId: number,
    public collaboratorId: number,
    public collaboratorName: string,
    public collaboratorSurname: string,
    public collaboratorEmail: string | null,
    public joinedDate: Date,
  ) {}
}