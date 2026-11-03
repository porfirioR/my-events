import { SavingsMovementGoalInput, SavingsMovementHelper } from './savings-movement.helper';
import { MovementType, ProgressionType } from '../enums';

const goal = (overrides: Partial<SavingsMovementGoalInput>): SavingsMovementGoalInput => ({
  progressionTypeId: ProgressionType.FreeForm,
  statusId: 1,
  currentAmount: 1_000,
  targetAmount: 6_000,
  ...overrides,
});

describe('SavingsMovementHelper', () => {
  it('FreeForm withdrawal reduces the balance and keeps the goal active', () => {
    const result = SavingsMovementHelper.apply(goal({}), MovementType.Withdrawal, 400);
    expect(result).toEqual({ newCurrentAmount: 600, newStatusId: null });
  });

  it('FreeForm withdrawal can take the whole balance', () => {
    const result = SavingsMovementHelper.apply(goal({}), MovementType.Withdrawal, 1_000);
    expect(result).toEqual({ newCurrentAmount: 0, newStatusId: null });
  });

  it('FreeForm withdrawal cannot exceed the balance', () => {
    const result = SavingsMovementHelper.apply(goal({}), MovementType.Withdrawal, 1_001);
    expect(result).toEqual({ error: 'Amount exceeds available balance (1000)' });
  });

  it('FreeForm withdrawal on a completed goal reopens it', () => {
    const result = SavingsMovementHelper.apply(goal({ statusId: 2, currentAmount: 6_000 }), MovementType.Withdrawal, 250);
    expect(result).toEqual({ newCurrentAmount: 5_750, newStatusId: 1 });
  });

  it('FreeForm deposit completes the goal when it reaches the target', () => {
    const result = SavingsMovementHelper.apply(goal({ currentAmount: 5_000 }), MovementType.Deposit, 1_000);
    expect(result).toEqual({ newCurrentAmount: 6_000, newStatusId: 2 });
  });

  it('FreeForm deposit cannot exceed the target', () => {
    const result = SavingsMovementHelper.apply(goal({ currentAmount: 5_500 }), MovementType.Deposit, 600);
    expect(result).toEqual({ error: 'Deposit would exceed target. Remaining: 500' });
  });

  it('FreeForm deposit is rejected on a completed goal', () => {
    const result = SavingsMovementHelper.apply(goal({ statusId: 2 }), MovementType.Deposit, 100);
    expect(result).toEqual({ error: 'Cannot add movements to inactive goals' });
  });

  it('rejects movements on withdrawn, cancelled or paused goals', () => {
    for (const statusId of [3, 4, 5]) {
      expect(SavingsMovementHelper.apply(goal({ statusId }), MovementType.Withdrawal, 100))
        .toEqual({ error: 'Cannot add movements to inactive goals' });
    }
  });

  it('MutualFund withdrawal is bounded by balance plus accrued interest and never changes status', () => {
    const fund = goal({ progressionTypeId: ProgressionType.MutualFund, targetAmount: 0, mutualFundMaxWithdrawal: 1_050 });
    expect(SavingsMovementHelper.apply(fund, MovementType.Withdrawal, 1_000)).toEqual({ newCurrentAmount: 0, newStatusId: null });
    expect(SavingsMovementHelper.apply(fund, MovementType.Withdrawal, 1_051))
      .toEqual({ error: 'Amount exceeds available balance plus maximum accrued interest (1050)' });
  });

  it('MutualFund deposit has no target limit', () => {
    const fund = goal({ progressionTypeId: ProgressionType.MutualFund, targetAmount: 0 });
    expect(SavingsMovementHelper.apply(fund, MovementType.Deposit, 50_000)).toEqual({ newCurrentAmount: 51_000, newStatusId: null });
  });

  it('rejects installment-based and locked types', () => {
    for (const progressionTypeId of [ProgressionType.Fixed, ProgressionType.Scheduled, ProgressionType.FixedDeposit, ProgressionType.Rotating]) {
      expect(SavingsMovementHelper.apply(goal({ progressionTypeId }), MovementType.Withdrawal, 100))
        .toEqual({ error: 'Movements are only allowed for FreeForm and MutualFund savings goals' });
    }
  });
});
