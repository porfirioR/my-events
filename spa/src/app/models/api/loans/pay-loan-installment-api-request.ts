export class PayLoanInstallmentApiRequest {
  constructor(
    public amount: number,
    public description?: string,
  ) {}
}
