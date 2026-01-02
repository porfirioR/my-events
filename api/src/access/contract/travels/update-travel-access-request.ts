export class UpdateTravelAccessRequest {
  constructor(
    public id: number,
    public name: string,
    public createdByUserId: number,
    public status: string,
    public description: string | null,
    public startDate: Date | null,
    public endDate: Date | null,
    public defaultCurrencyId: number | null,
    public lastUpdatedByUserId: number,
    public finalizedDate: Date | null,
  ) {}
}