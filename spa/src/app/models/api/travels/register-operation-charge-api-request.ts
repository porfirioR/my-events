// chargedAmount y chargedCurrencyId en null = borrar el cobro registrado
export class RegisterOperationChargeApiRequest {
  constructor(
    public chargedAmount: number | null,
    public chargedCurrencyId: number | null,
  ) {}
}
