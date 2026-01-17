export class TravelMemberEntity {
  public id?: number;

  constructor(
    public travelid: number,
    public userid: number,
    public collaboratorid: number,
    public joineddate?: Date,
  ) {}
}