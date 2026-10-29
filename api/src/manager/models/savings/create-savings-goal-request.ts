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
    public readonly frequencyId?: number | null,
    public readonly annualRatePercentage?: number | null,
    public readonly paymentPeriod?: number | null,
    public readonly institutionId?: number | null,
    public readonly payoutDate?: Date | null,
    public readonly initialPaidInstallments?: number | null, // Cuotas ya pagadas al cargar un ahorro en curso (ej. rueda 57/60)
  ) {}
}
