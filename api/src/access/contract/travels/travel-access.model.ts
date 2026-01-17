export class TravelAccessModel {
  constructor(
    public id: number,
    public name: string,
    public createdByUserId: number,
    public status: string,
    public dateCreated: Date,
    public description: string | null,
    public startDate: Date | null,
    public endDate: Date | null,
    public defaultCurrencyId: number | null,
    public lastUpdatedByUserId: number | null,
    public updatedAt: Date | null,
    public finalizedDate: Date | null,
  ) {}
}