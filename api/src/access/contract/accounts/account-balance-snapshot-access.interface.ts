import { AccountBalanceSnapshotAccessModel } from './account-balance-snapshot-access.model';
import { UpsertAccountBalanceSnapshotAccessRequest } from './upsert-account-balance-snapshot-access-request';

export interface IAccountBalanceSnapshotAccessService {
  // Inserta o actualiza por (cuenta, mes): cargar dos veces el mismo mes no duplica
  upsertMany(requests: UpsertAccountBalanceSnapshotAccessRequest[]): Promise<AccountBalanceSnapshotAccessModel[]>;
  // Fechas 'YYYY-MM-DD' inclusivas; null = sin límite
  getByAccountIds(accountIds: number[], from: string | null, to: string | null): Promise<AccountBalanceSnapshotAccessModel[]>;
}
