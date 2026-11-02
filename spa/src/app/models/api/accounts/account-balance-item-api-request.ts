export class AccountBalanceItemApiRequest {
  constructor(
    public accountId: number,
    public balance: number,
  ) {}
}
