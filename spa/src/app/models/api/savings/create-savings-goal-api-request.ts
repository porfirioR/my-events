export class CreateSavingsGoalApiRequest {
  constructor(
    public currencyId: number,
    public name: string,
    public progressionTypeId: number,
    public startDate: string,
    public description?: string,
    public targetAmount?: number,
    public numberOfInstallments?: number,
    public baseAmount?: number,
    public incrementAmount?: number,
    public expectedEndDate?: string
  ) {}
}
