export class LoanPaymentApiModel {
  constructor(
    public id: number,
    public loanId: number,
    public installmentId: number | null,
    public amount: number,
    public description: string | null,
    public paymentDate: string,
  ) {}
}
