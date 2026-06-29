export class UpdateLoanApiRequest {
  constructor(
    public name: string,
    public description: string | null,
    public loanTypeId: number,
    public statusId: number,
    public administrativeFees: number | null = null,
    public ivaPercentage: number | null = null,
    public insuranceAmount: number | null = null,
  ) {}
}
