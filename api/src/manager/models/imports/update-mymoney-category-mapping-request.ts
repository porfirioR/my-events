export class UpdateMyMoneyCategoryMappingRequest {
  constructor(
    public readonly id: number,
    public readonly userId: number,
    public readonly kind: number,
    public readonly isEssential: boolean,
    public readonly isExtraordinary: boolean,
    public readonly accountId: number | null,
    public readonly savingsGoalId: number | null,
    public readonly loanId: number | null,
  ) {}
}
