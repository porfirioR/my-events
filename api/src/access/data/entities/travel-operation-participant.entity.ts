export class TravelOperationParticipantEntity {
  public id?: number;

  constructor(
    public operationid: number,
    public travelmemberid: number,
    public shareamount: number,
    public datecreated?: Date,
  ) {}
}