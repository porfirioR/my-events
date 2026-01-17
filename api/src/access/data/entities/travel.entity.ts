export class TravelEntity {
  public id?: number;

  constructor(
    public name: string,
    public createdbyuserid: number,
    public status: string,
    public description?: string | null,
    public startdate?: Date | null,
    public enddate?: Date | null,
    public defaultcurrencyid?: number | null,
    public datecreated?: Date,
    public lastupdatedbyuserid?: number | null,
    public updatedat?: Date | null,
    public finalizeddate?: Date | null,
  ) {}
}