export class CreateSavingsGoalRequest {
  constructor(
    public readonly userId: number,
    public readonly currencyId: number,
    public readonly name: string,
    public readonly progressionTypeId: number,
    public readonly startDate: Date,
    public readonly description?: string | null,
    public readonly targetAmount?: number | null, // Opcional: se calcula si no se provee
    public readonly numberOfInstallments?: number | null,
    public readonly baseAmount?: number | null,
    public readonly incrementAmount?: number | null,
    public readonly expectedEndDate?: Date | null,
  ) {}
}
