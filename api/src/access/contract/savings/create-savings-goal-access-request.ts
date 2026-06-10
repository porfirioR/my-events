export class CreateSavingsGoalAccessRequest {
  constructor(
    public readonly userId: number,
    public readonly currencyId: number,
    public readonly name: string,
    public readonly targetAmount: number,
    public readonly progressionTypeId: number,
    public readonly startDate: Date,
    public readonly description?: string | null,
    public readonly numberOfInstallments?: number | null,
    public readonly baseAmount?: number | null,
    public readonly incrementAmount?: number | null,
    public readonly expectedEndDate?: Date | null,
    public readonly frequencyId?: number | null,
    public readonly annualRatePercentage?: number | null,
    public readonly paymentPeriod?: number | null,
  ) { }
}
