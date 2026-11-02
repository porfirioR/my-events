import { AccountBalanceItemRequest } from './account-balance-item-request';

export class UpsertAccountBalancesRequest {
  constructor(
    public readonly userId: number,
    // 'YYYY-MM' o 'YYYY-MM-DD'; se guarda como el día 1 de ese mes
    public readonly snapshotDate: string,
    public readonly balances: AccountBalanceItemRequest[],
  ) {}
}
