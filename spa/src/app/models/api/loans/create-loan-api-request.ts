export class CreateLoanApiRequest {
  constructor(
    public currencyId: number,
    public loanTypeId: number,
    public loanEntityId: number,
    public lenderCustomName: string | null,
    public name: string,
    public description: string | null,
    public principalAmount: number,
    public annualRatePercentage: number,
    public numberOfInstallments: number,
    public actualInstallmentAmount: number | null,
    public actualTotalAmount: number | null,
    public amortizationType: string,
    public startDate: string,
    public administrativeFees: number | null = null,
    public ivaPercentage: number | null = null,
    public insuranceAmount: number | null = null,
  ) {}
}
