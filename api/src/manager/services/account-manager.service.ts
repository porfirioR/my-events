import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ACCOUNT_TOKENS, FINANCIAL_INSTITUTION_TOKENS } from '../../utility/constants/injection-tokens.const';
import { IFinancialInstitutionAccessService } from '../../access/contract/financial-institutions';
import {
  IAccountAccessService,
  IAccountBalanceSnapshotAccessService,
  AccountAccessModel,
  AccountBalanceSnapshotAccessModel,
  CreateAccountAccessRequest,
  UpdateAccountAccessRequest,
  UpsertAccountBalanceSnapshotAccessRequest,
} from '../../access/contract/accounts';
import {
  AccountModel,
  AccountBalanceSnapshotModel,
  CreateAccountRequest,
  UpdateAccountRequest,
  UpsertAccountBalancesRequest,
} from '../models/accounts';
import { AccountType } from '../../utility/enums';

@Injectable()
export class AccountManagerService {
  constructor(
    @Inject(ACCOUNT_TOKENS.ACCOUNT_ACCESS_SERVICE)
    private readonly accountAccessService: IAccountAccessService,

    @Inject(ACCOUNT_TOKENS.BALANCE_SNAPSHOT_ACCESS_SERVICE)
    private readonly balanceSnapshotAccessService: IAccountBalanceSnapshotAccessService,

    @Inject(FINANCIAL_INSTITUTION_TOKENS.ACCESS_SERVICE)
    private readonly financialInstitutionAccessService: IFinancialInstitutionAccessService,
  ) {}

  // ==================== ACCOUNTS ====================

  public createAccount = async (request: CreateAccountRequest): Promise<AccountModel> => {
    await this.validateAccount(request.userId, request.institutionId, request.name, request.type);
    const accessRequest = new CreateAccountAccessRequest(
      request.userId,
      request.institutionId,
      request.currencyId,
      request.name.trim(),
      request.type,
      request.notes?.trim() || null,
    );
    const account = await this.accountAccessService.create(accessRequest);
    return this.mapToModel(account, null);
  };

  // Cada cuenta con su saldo actual (último snapshot)
  public getAllAccounts = async (userId: number): Promise<AccountModel[]> => {
    const accounts = await this.accountAccessService.getAll(userId);
    const snapshots = await this.balanceSnapshotAccessService.getByAccountIds(accounts.map(a => a.id), null, null);
    const latestByAccount = this.getLatestByAccount(snapshots);
    return accounts.map(account => this.mapToModel(account, latestByAccount.get(account.id) ?? null));
  };

  public getAccountById = async (id: number, userId: number): Promise<AccountModel> => {
    const account = await this.accountAccessService.getById(id, userId);
    const snapshots = await this.balanceSnapshotAccessService.getByAccountIds([account.id], null, null);
    return this.mapToModel(account, this.getLatestByAccount(snapshots).get(account.id) ?? null);
  };

  public updateAccount = async (request: UpdateAccountRequest): Promise<AccountModel> => {
    await this.validateAccount(request.userId, request.institutionId, request.name, request.type);
    const accessRequest = new UpdateAccountAccessRequest(
      request.id,
      request.userId,
      request.institutionId,
      request.currencyId,
      request.name.trim(),
      request.type,
      request.isActive,
      request.notes?.trim() || null,
    );
    const account = await this.accountAccessService.update(accessRequest);
    return this.getAccountById(account.id, request.userId);
  };

  public deleteAccount = async (id: number, userId: number): Promise<void> => {
    await this.accountAccessService.delete(id, userId);
  };

  // ==================== BALANCE SNAPSHOTS ====================

  // Carga los saldos de un mes; si el mes ya estaba cargado, los actualiza
  public upsertBalances = async (request: UpsertAccountBalancesRequest): Promise<AccountBalanceSnapshotModel[]> => {
    const snapshotDate = this.toMonthStart(request.snapshotDate);
    if (!request.balances?.length) throw new BadRequestException('At least one balance is required');

    const accountIds = request.balances.map(b => b.accountId);
    if (new Set(accountIds).size !== accountIds.length) {
      throw new BadRequestException('Each account can appear only once per month');
    }

    const userAccountIds = new Set((await this.accountAccessService.getAll(request.userId)).map(a => a.id));
    const foreignAccountId = accountIds.find(id => !userAccountIds.has(id));
    if (foreignAccountId !== undefined) throw new BadRequestException(`Account ${foreignAccountId} not found`);

    const invalidBalance = request.balances.find(b => !Number.isInteger(b.balance));
    if (invalidBalance) throw new BadRequestException(`Invalid balance for account ${invalidBalance.accountId}`);

    const accessRequests = request.balances.map(b =>
      new UpsertAccountBalanceSnapshotAccessRequest(b.accountId, snapshotDate, b.balance));
    const snapshots = await this.balanceSnapshotAccessService.upsertMany(accessRequests);
    return snapshots.map(this.mapSnapshotToModel);
  };

  // Histórico de saldos de las cuentas del usuario; from/to aceptan 'YYYY-MM' o 'YYYY-MM-DD'
  public getBalances = async (userId: number, from: string | null, to: string | null): Promise<AccountBalanceSnapshotModel[]> => {
    const fromDate = from ? this.toMonthStart(from) : null;
    const toDate = to ? this.toMonthStart(to) : null;
    if (fromDate && toDate && fromDate > toDate) throw new BadRequestException('"from" must be before "to"');

    const accounts = await this.accountAccessService.getAll(userId);
    const snapshots = await this.balanceSnapshotAccessService.getByAccountIds(accounts.map(a => a.id), fromDate, toDate);
    return snapshots.map(this.mapSnapshotToModel);
  };

  // ==================== HELPERS ====================

  private validateAccount = async (userId: number, institutionId: number, name: string, type: number): Promise<void> => {
    if (!name?.trim()) throw new BadRequestException('Name is required');
    if (!Object.values(AccountType).includes(type)) throw new BadRequestException(`Invalid account type ${type}`);
    // La entidad tiene que ser del sistema o propia del usuario (NotFound si no)
    await this.financialInstitutionAccessService.getById(institutionId, userId);
  };

  // 'YYYY-MM' o 'YYYY-MM-DD' → 'YYYY-MM-01' (el snapshot siempre es del día 1)
  private toMonthStart = (date: string): string => {
    const match = /^(\d{4})-(\d{2})(-\d{2})?$/.exec(date ?? '');
    const month = match ? +match[2] : 0;
    if (!match || month < 1 || month > 12) throw new BadRequestException(`Invalid month "${date}", expected YYYY-MM`);
    return `${match[1]}-${match[2]}-01`;
  };

  // Snapshots ordenados por fecha ascendente: el último que aparece de cada cuenta es el más reciente
  private getLatestByAccount = (snapshots: AccountBalanceSnapshotAccessModel[]): Map<number, AccountBalanceSnapshotAccessModel> => {
    const latest = new Map<number, AccountBalanceSnapshotAccessModel>();
    snapshots.forEach(snapshot => {
      const current = latest.get(snapshot.accountId);
      if (!current || snapshot.snapshotDate > current.snapshotDate) latest.set(snapshot.accountId, snapshot);
    });
    return latest;
  };

  private mapToModel = (account: AccountAccessModel, latest: AccountBalanceSnapshotAccessModel | null): AccountModel =>
    new AccountModel(
      account.id,
      account.userId,
      account.institutionId,
      account.currencyId,
      account.name,
      account.type,
      account.isActive,
      account.notes,
      latest?.balance ?? null,
      latest?.snapshotDate ?? null,
    );

  private mapSnapshotToModel = (snapshot: AccountBalanceSnapshotAccessModel): AccountBalanceSnapshotModel =>
    new AccountBalanceSnapshotModel(
      snapshot.id,
      snapshot.accountId,
      snapshot.snapshotDate,
      snapshot.balance,
    );
}
