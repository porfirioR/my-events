import { ArrayNotEmpty, IsArray, IsString, Matches } from 'class-validator';
import { AccountBalanceItemApiRequest } from './account-balance-item-api-request';

export class UpsertAccountBalancesApiRequest {
  // 'YYYY-MM' (o 'YYYY-MM-DD'; se guarda como el día 1 del mes)
  @IsString()
  @Matches(/^\d{4}-\d{2}(-\d{2})?$/)
  snapshotDate: string;

  @IsArray()
  @ArrayNotEmpty()
  balances: AccountBalanceItemApiRequest[];
}
