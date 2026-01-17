export class UpdateTravelApiRequest {
  constructor(
    public name: string,
    public description: string | null,
    public startDate: string | null,
    public endDate: string | null,
    public defaultCurrencyId: number | null
  ) {}
}