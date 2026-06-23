export class LoanPaymentAccessModel {
  constructor(
    public readonly id: number,
    public readonly loanId: number,
    public readonly installmentId: number | null,
    public readonly amount: number,
    public readonly description: string | null,
    public readonly paymentDate: Date,
  ) {}
}
