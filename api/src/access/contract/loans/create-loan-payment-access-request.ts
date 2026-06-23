export class CreateLoanPaymentAccessRequest {
  constructor(
    public readonly loanId: number,
    public readonly installmentId: number | null,
    public readonly amount: number,
    public readonly description: string | null,
  ) {}
}
