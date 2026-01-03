export class AddTravelMemberRequest {
  constructor(
    public userId: number,
    public travelId: number,
    public collaboratorId: number,
  ) {}
}