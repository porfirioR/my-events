export class CreateLoanInstallmentAccessRequest {
  constructor(
    public readonly loanId: number,
    public readonly installmentNumber: number,
    public readonly dueDate: Date | null,
    public readonly totalAmount: number,
    public readonly principalAmount: number,
    public readonly interestAmount: number,
    public readonly remainingBalance: number,
  ) {}
}
