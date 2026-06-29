export class CreateLoanAccessRequest {
  constructor(
    public readonly userId: number,
    public readonly currencyId: number,
    public readonly loanTypeId: number,
    public readonly loanEntityId: number,
    public readonly lenderCustomName: string | null,
    public readonly name: string,
    public readonly description: string | null,
    public readonly principalAmount: number,
    public readonly annualRatePercentage: number,
    public readonly numberOfInstallments: number,
    public readonly calculatedInstallmentAmount: number,
    public readonly calculatedTotalInterest: number,
    public readonly calculatedTotalAmount: number,
    public readonly actualInstallmentAmount: number,
    public readonly actualTotalAmount: number,
    public readonly currentBalance: number,
    public readonly amortizationType: string,
    public readonly startDate: Date,
    public readonly expectedEndDate: Date | null,
  ) {}
}
