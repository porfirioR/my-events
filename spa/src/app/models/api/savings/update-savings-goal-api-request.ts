export class UpdateSavingsGoalApiRequest {
  constructor(
    public id: number,
    public currencyId: number,
    public name: string,
    public targetAmount: number,
    public progressionTypeId: number,
    public statusId: number,
    public startDate: string,
    public description?: string,
    public numberOfInstallments?: number,
    public baseAmount?: number,
    public incrementAmount?: number,
    public expectedEndDate?: string
  ) {}
}