// id null → crear
export class UpsertMyMoneyDescriptionRuleRequest {
  constructor(
    public readonly id: number | null,
    public readonly userId: number,
    public readonly pattern: string,
    public readonly accountId: number | null,
    public readonly savingsGoalId: number | null,
    public readonly loanId: number | null,
  ) {}
}
