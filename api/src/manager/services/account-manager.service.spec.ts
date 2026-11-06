import { BadRequestException } from '@nestjs/common';
import { AccountManagerService } from './account-manager.service';
import { AccountAccessModel, AccountBalanceSnapshotAccessModel } from '../../access/contract/accounts';

const GUARANI = 4;
const DOLLAR = 2;
const currentMonth = () => `${new Date().toISOString().substring(0, 7)}-01`;

describe('AccountManagerService.applyMovement', () => {
  let accountAccess: { getById: jest.Mock };
  let snapshotAccess: { getByAccountIds: jest.Mock; upsertMany: jest.Mock };
  let service: AccountManagerService;

  const account = (overrides: Partial<AccountAccessModel> = {}): AccountAccessModel =>
    ({ id: 7, userId: 1, institutionId: 6, currencyId: GUARANI, name: 'Efectivo', type: 3, isActive: true, notes: null, ...overrides }) as AccountAccessModel;

  const snapshot = (snapshotDate: string, balance: number) =>
    new AccountBalanceSnapshotAccessModel(1, 7, snapshotDate, balance);

  beforeEach(() => {
    accountAccess = { getById: jest.fn().mockResolvedValue(account()) };
    snapshotAccess = { getByAccountIds: jest.fn().mockResolvedValue([]), upsertMany: jest.fn().mockResolvedValue([]) };
    service = new AccountManagerService(accountAccess as any, snapshotAccess as any, {} as any);
  });

  const upserted = () => snapshotAccess.upsertMany.mock.calls[0][0][0];

  it('adds the amount to the latest balance and saves it in the current month', async () => {
    snapshotAccess.getByAccountIds.mockResolvedValue([snapshot('2026-09-01', 100_000), snapshot('2026-10-01', 247_000)]);
    await service.applyMovement(1, 7, GUARANI, 262_500);
    expect(upserted()).toMatchObject({ accountId: 7, snapshotDate: currentMonth(), balance: 509_500 });
  });

  it('subtracts a negative amount and allows a negative balance', async () => {
    snapshotAccess.getByAccountIds.mockResolvedValue([snapshot('2026-10-01', 100_000)]);
    await service.applyMovement(1, 7, GUARANI, -150_000);
    expect(upserted().balance).toBe(-50_000);
  });

  it('starts from zero when the account has no balance yet', async () => {
    await service.applyMovement(1, 7, GUARANI, 262_500);
    expect(upserted().balance).toBe(262_500);
  });

  it('keeps a later month already loaded instead of going back to the current one', async () => {
    snapshotAccess.getByAccountIds.mockResolvedValue([snapshot('2999-01-01', 10_000)]);
    await service.applyMovement(1, 7, GUARANI, 5_000);
    expect(upserted()).toMatchObject({ snapshotDate: '2999-01-01', balance: 15_000 });
  });

  it('rejects an account in another currency', async () => {
    accountAccess.getById.mockResolvedValue(account({ currencyId: DOLLAR }));
    await expect(service.applyMovement(1, 7, GUARANI, 1_000)).rejects.toThrow(BadRequestException);
    expect(snapshotAccess.upsertMany).not.toHaveBeenCalled();
  });

  it('rejects an inactive account, except when reverting a previous movement', async () => {
    accountAccess.getById.mockResolvedValue(account({ isActive: false }));
    await expect(service.applyMovement(1, 7, GUARANI, 1_000)).rejects.toThrow(BadRequestException);
    await service.applyMovement(1, 7, GUARANI, -1_000, true);
    expect(upserted().balance).toBe(-1_000);
  });
});
