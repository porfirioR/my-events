export class AccountBalanceItemRequest {
  constructor(
    public readonly accountId: number,
    public readonly balance: number,
  ) {}
}
