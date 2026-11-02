import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { BaseAccessService, DbContextService } from '.';
import { DatabaseColumns, TableEnum } from '../../../utility/enums';
import {
  IAccountBalanceSnapshotAccessService,
  AccountBalanceSnapshotAccessModel,
  UpsertAccountBalanceSnapshotAccessRequest,
} from '../../contract/accounts';
import { AccountBalanceSnapshotEntity } from '../entities/account-balance-snapshot.entity';

@Injectable()
export class AccountBalanceSnapshotAccessService extends BaseAccessService implements IAccountBalanceSnapshotAccessService {
  constructor(dbContextService: DbContextService) {
    super(dbContextService);
  }

  // ON CONFLICT (accountid, snapshotdate): actualiza el saldo del mes en vez de duplicarlo
  public upsertMany = async (requests: UpsertAccountBalanceSnapshotAccessRequest[]): Promise<AccountBalanceSnapshotAccessModel[]> => {
    if (requests.length === 0) return [];
    const now = new Date().toISOString();
    const { data, error } = await this.dbContext
      .from(TableEnum.AccountBalanceSnapshots)
      .upsert(
        requests.map(request => ({
          accountid: request.accountId,
          snapshotdate: request.snapshotDate,
          balance: request.balance,
          dateupdated: now,
        })),
        { onConflict: `${DatabaseColumns.AccountId},${DatabaseColumns.SnapshotDate}` },
      )
      .select();

    if (error) throw new InternalServerErrorException(error.message);
    return (data as AccountBalanceSnapshotEntity[] ?? []).map(this.mapEntityToModel);
  };

  public getByAccountIds = async (accountIds: number[], from: string | null, to: string | null): Promise<AccountBalanceSnapshotAccessModel[]> => {
    if (accountIds.length === 0) return [];
    let query = this.dbContext
      .from(TableEnum.AccountBalanceSnapshots)
      .select(DatabaseColumns.All)
      .in(DatabaseColumns.AccountId, accountIds);

    if (from) query = query.gte(DatabaseColumns.SnapshotDate, from);
    if (to) query = query.lte(DatabaseColumns.SnapshotDate, to);

    const { data, error } = await query
      .order(DatabaseColumns.SnapshotDate, { ascending: true })
      .order(DatabaseColumns.AccountId, { ascending: true });

    if (error) throw new InternalServerErrorException(error.message);
    return (data as AccountBalanceSnapshotEntity[] ?? []).map(this.mapEntityToModel);
  };

  private mapEntityToModel = (entity: AccountBalanceSnapshotEntity): AccountBalanceSnapshotAccessModel =>
    new AccountBalanceSnapshotAccessModel(
      entity.id,
      entity.accountid,
      entity.snapshotdate,
      entity.balance,
    );
}
