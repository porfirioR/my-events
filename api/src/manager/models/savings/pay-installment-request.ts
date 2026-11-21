export class PayInstallmentRequest {
  constructor(
    public readonly userId: number,
    public readonly savingsGoalId: number,
    public readonly installmentId: number,
    public readonly amount: number,
    public readonly description?: string | null,
    public readonly accountId: number | null = null,
    // Fecha real del aporte (p. ej. la del movimiento de MyMoney al conciliar); null = ahora
    public readonly paymentDate: Date | null = null,
  ) {}
}