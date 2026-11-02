import { AccountBalanceItemApiRequest } from './account-balance-item-api-request';

export class UpsertAccountBalancesApiRequest {
  constructor(
    // 'YYYY-MM'
    public snapshotDate: string,
    public balances: AccountBalanceItemApiRequest[],
  ) {}
}
