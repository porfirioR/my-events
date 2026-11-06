export class PayLoanInstallmentApiRequest {
  constructor(
    public amount: number,
    public description?: string | null,
    public paymentDate?: string | null,
    // Cuenta por la que entró o salió la plata; null = no tocar saldos
    public accountId?: number | null,
  ) {}
}
