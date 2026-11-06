export class PayInstallmentApiRequest {
  constructor(
    public amount: number,
    public description?: string,
    // Cuenta de la que sale la cuota; sin cuenta no se toca ningún saldo
    public accountId?: number,
  ) {}
}