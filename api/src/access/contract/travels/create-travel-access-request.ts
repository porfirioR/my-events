export class CreateTravelAccessRequest {
  constructor(
    public name: string,
    public createdByUserId: number,
    public description: string | null,
    public startDate: Date | null,
    public endDate: Date | null,
    public defaultCurrencyId: number | null,
  ) {}
}