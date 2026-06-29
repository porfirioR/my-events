export class UpdateLoanRequest {
  constructor(
    public readonly id: number,
    public readonly userId: number,
    public readonly name: string,
    public readonly description: string | null,
    public readonly loanTypeId: number,
    public readonly statusId: number,
    public readonly administrativeFees: number | null = null,
    public readonly ivaPercentage: number | null = null,
    public readonly insuranceAmount: number | null = null,
  ) {}
}
