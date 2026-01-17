export class AddTravelMemberAccessRequest {
  constructor(
    public travelId: number,
    public userId: number,
    public collaboratorId: number,
  ) {}
}