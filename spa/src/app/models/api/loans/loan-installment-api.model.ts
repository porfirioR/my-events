export class LoanInstallmentApiModel {
  constructor(
    public id: number,
    public loanId: number,
    public installmentNumber: number,
    public dueDate: string | null,
    public totalAmount: number,
    public principalAmount: number,
    public interestAmount: number,
    public remainingBalance: number,
    public statusId: number,
    public paidDate: string | null,
    public paidAmount: number | null,
  ) {}
}
