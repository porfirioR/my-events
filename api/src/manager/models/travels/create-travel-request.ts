export class CreateTravelRequest {
  constructor(
    public userId: number,
    public name: string,
    public description: string | null,
    public startDate: Date | null,
    public endDate: Date | null,
    public defaultCurrencyId: number | null,
  ) {}
}