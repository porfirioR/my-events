export class UpdateLoanApiRequest {
  constructor(
    public name: string,
    public description: string | null,
    public loanTypeId: number,
    public statusId: number,
  ) {}
}
