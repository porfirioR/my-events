export class TravelMemberAccessModel {
  constructor(
    public id: number,
    public travelId: number,
    public userId: number,
    public collaboratorId: number,
    public joinedDate: Date,
  ) {}
}