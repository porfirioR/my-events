export class PayLoanInstallmentRequest {
  constructor(
    public readonly userId: number,
    public readonly loanId: number,
    public readonly installmentId: number,
    public readonly amount: number,
    public readonly description: string | null,
    public readonly paymentDate: Date | null,
  ) {}
}
