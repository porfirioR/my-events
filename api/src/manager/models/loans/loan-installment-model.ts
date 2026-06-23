export class LoanInstallmentModel {
  constructor(
    public readonly id: number,
    public readonly loanId: number,
    public readonly installmentNumber: number,
    public readonly dueDate: Date | null,
    public readonly totalAmount: number,
    public readonly principalAmount: number,
    public readonly interestAmount: number,
    public readonly remainingBalance: number,
    public readonly statusId: number,
    public readonly paidDate: Date | null,
    public readonly paidAmount: number | null,
  ) {}
}
