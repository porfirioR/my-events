export class UpdateLoanAccessRequest {
  constructor(
    public readonly id: number,
    public readonly userId: number,
    public readonly name: string,
    public readonly description: string | null,
    public readonly loanTypeId: number,
    public readonly statusId: number,
  ) {}
}
