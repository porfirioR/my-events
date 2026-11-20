import { MyMoneyCategoryKind, MyMoneyMovementTypeEnum } from '../enums';
import { MyMoneyMovement } from './mymoney-export.helper';
import { ImportedMovementSnapshot, MyMoneyImportHelper } from './mymoney-import.helper';

const { Expense, Income } = MyMoneyMovementTypeEnum;

const movement = (id: string, date: string, amount = 1000, overrides: Partial<MyMoneyMovement> = {}): MyMoneyMovement => ({
  id,
  date,
  type: 'expense',
  categoryId: 'food',
  amount,
  memorandum: '',
  ...overrides,
});

const stored = (id: number, externalId: string, date: string, amount = 1000, overrides: Partial<ImportedMovementSnapshot> = {}): ImportedMovementSnapshot => ({
  id,
  externalId,
  categoryExternalId: 'food',
  date,
  movementType: Expense,
  amount,
  note: '',
  ...overrides,
});

const range = { from: '2026-10-01', to: '2026-10-31' };

describe('MyMoneyImportHelper', () => {
  describe('plan', () => {
    it('creates everything on the first import', () => {
      const plan = MyMoneyImportHelper.plan([], { ...range, movements: [movement('a', '2026-10-01'), movement('b', '2026-10-31')] });
      expect(plan.toCreate.map(m => m.externalId)).toEqual(['a', 'b']);
      expect(plan.toUpdate).toEqual([]);
      expect(plan.toDelete).toEqual([]);
      expect(plan.unchanged).toBe(0);
    });

    it('gives the same result when the same file is imported twice', () => {
      const movements = [movement('a', '2026-10-05', 1000, { memorandum: 'Aho3 5/12' })];
      const plan = MyMoneyImportHelper.plan([stored(1, 'a', '2026-10-05', 1000, { note: 'Aho3 5/12' })], { ...range, movements });
      expect(plan).toEqual({ toCreate: [], toUpdate: [], toDelete: [], unchanged: 1 });
    });

    it('updates movements edited in MyMoney, even when they moved to another date', () => {
      const plan = MyMoneyImportHelper.plan(
        [stored(1, 'a', '2026-09-30'), stored(2, 'b', '2026-10-02')],
        { ...range, movements: [movement('a', '2026-10-01'), movement('b', '2026-10-02', 2000, { type: 'income', categoryId: 'salary' })] },
      );
      expect(plan.toUpdate).toEqual([
        { externalId: 'a', categoryExternalId: 'food', date: '2026-10-01', movementType: Expense, amount: 1000, note: '' },
        { externalId: 'b', categoryExternalId: 'salary', date: '2026-10-02', movementType: Income, amount: 2000, note: '' },
      ]);
      expect(plan.toDelete).toEqual([]);
    });

    it('deletes what was imported inside the range and is no longer in the file', () => {
      const plan = MyMoneyImportHelper.plan(
        [stored(1, 'kept', '2026-10-10'), stored(2, 'deleted', '2026-10-10'), stored(3, 'before', '2026-09-30'), stored(4, 'after', '2026-11-01')],
        { ...range, movements: [movement('kept', '2026-10-10')] },
      );
      expect(plan.toDelete).toEqual([2]);
      expect(plan.unchanged).toBe(1);
    });

    it('cuts the note to the column length', () => {
      const plan = MyMoneyImportHelper.plan([], { ...range, movements: [movement('a', '2026-10-01', 1, { memorandum: 'x'.repeat(600) })] });
      expect(plan.toCreate[0].note.length).toBe(500);
    });
  });

  describe('classify', () => {
    it('adds each movement to the kind of its category and leaves pending ones unclassified', () => {
      const summary = MyMoneyImportHelper.classify(
        [
          movement('a', '2026-10-01', 100, { categoryId: 'food' }),
          movement('b', '2026-10-01', 200, { categoryId: 'saving' }),
          movement('c', '2026-10-01', 300, { type: 'income', categoryId: 'salary' }),
          movement('d', '2026-10-01', 400, { type: 'income', categoryId: 'refunds' }),
          movement('e', '2026-10-01', 500, { categoryId: 'new' }),
          movement('f', '2026-10-01', 600, { categoryId: 'unknown' }),
        ],
        [
          { categoryExternalId: 'food', kind: MyMoneyCategoryKind.Consumption, needsReview: false },
          { categoryExternalId: 'saving', kind: MyMoneyCategoryKind.Transfer, needsReview: false },
          { categoryExternalId: 'salary', kind: MyMoneyCategoryKind.Income, needsReview: false },
          { categoryExternalId: 'refunds', kind: MyMoneyCategoryKind.Refund, needsReview: false },
          { categoryExternalId: 'new', kind: MyMoneyCategoryKind.Consumption, needsReview: true },
        ],
      );
      expect(summary).toEqual({
        consumption: { count: 1, amount: 100 },
        transfer: { count: 1, amount: 200 },
        income: { count: 1, amount: 300 },
        refund: { count: 1, amount: 400 },
        unclassified: { count: 2, amount: 1100 },
      });
    });
  });
});
