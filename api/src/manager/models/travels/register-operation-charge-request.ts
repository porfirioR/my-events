export class RegisterOperationChargeRequest {
  constructor(
    public userId: number,
    public operationId: number,
    // null en los dos = borrar el cobro registrado
    public chargedAmount: number | null,
    public chargedCurrencyId: number | null,
  ) {}
}
