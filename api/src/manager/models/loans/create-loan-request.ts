export class CreateLoanRequest {
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
    public readonly actualInstallmentAmount: number | null,
    public readonly actualTotalAmount: number | null,
    public readonly amortizationType: string,
    public readonly startDate: Date,
  ) {}
}
