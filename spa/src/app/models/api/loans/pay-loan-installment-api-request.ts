export class PayLoanInstallmentApiRequest {
  constructor(
    public amount: number,
    public description?: string | null,
    public paymentDate?: string | null,
  ) {}
}
