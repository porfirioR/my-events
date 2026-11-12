import { MyMoneyCategoryKind, MyMoneyMovementTypeEnum } from '../enums';
import { MyMoneyCategoryMappingHelper } from './mymoney-category-mapping.helper';
import { MyMoneyCategory } from './mymoney-export.helper';

const { Expense, Income } = MyMoneyMovementTypeEnum;
const { Consumption, Transfer, Refund } = MyMoneyCategoryKind;

const category = (id: string, name: string, type: 'income' | 'expense'): MyMoneyCategory => ({ id, name, type, active: true });

describe('MyMoneyCategoryMappingHelper', () => {
  describe('defaultClassification', () => {
    it('classifies expense transfers and leaves the rest as consumption', () => {
      ['Saving', 'Ahorro Casa', 'Loans', 'Investments'].forEach(name =>
        expect(MyMoneyCategoryMappingHelper.defaultClassification(name, Expense).kind).toBe(Transfer));
      expect(MyMoneyCategoryMappingHelper.defaultClassification('Clothing', Expense))
        .toEqual({ kind: Consumption, isEssential: false, isExtraordinary: false });
    });

    it('marks the default essential expenses', () => {
      ['Health', 'Car', 'Gas', 'House', 'Food', 'Super', 'Dentist', 'Tax', 'Pets', 'Telephone'].forEach(name =>
        expect(MyMoneyCategoryMappingHelper.defaultClassification(name, Expense))
          .toEqual({ kind: Consumption, isEssential: true, isExtraordinary: false }));
    });

    it('classifies income categories', () => {
      expect(MyMoneyCategoryMappingHelper.defaultClassification('Ahorros', Income).kind).toBe(Transfer);
      expect(MyMoneyCategoryMappingHelper.defaultClassification('Loans', Income).kind).toBe(Transfer);
      expect(MyMoneyCategoryMappingHelper.defaultClassification('Refunds', Income).kind).toBe(Refund);
      expect(MyMoneyCategoryMappingHelper.defaultClassification('Awards', Income))
        .toEqual({ kind: MyMoneyCategoryKind.Income, isEssential: false, isExtraordinary: true });
      // Extra work son trabajos extra reales: ingreso normal, igual que el salario
      expect(MyMoneyCategoryMappingHelper.defaultClassification('Extra work', Income))
        .toEqual({ kind: MyMoneyCategoryKind.Income, isEssential: false, isExtraordinary: false });
    });

    it('ignores case and surrounding spaces', () => {
      expect(MyMoneyCategoryMappingHelper.defaultClassification('  saving ', Expense).kind).toBe(Transfer);
    });
  });

  describe('normalize', () => {
    it('keeps essential only for consumption and extraordinary only for income', () => {
      expect(MyMoneyCategoryMappingHelper.normalize(Transfer, true, true))
        .toEqual({ kind: Transfer, isEssential: false, isExtraordinary: false });
      expect(MyMoneyCategoryMappingHelper.normalize(Consumption, true, true))
        .toEqual({ kind: Consumption, isEssential: true, isExtraordinary: false });
      expect(MyMoneyCategoryMappingHelper.normalize(MyMoneyCategoryKind.Income, true, true))
        .toEqual({ kind: MyMoneyCategoryKind.Income, isEssential: false, isExtraordinary: true });
    });
  });

  describe('isKindAllowed', () => {
    it('allows only consumption or transfer for expenses', () => {
      expect(MyMoneyCategoryMappingHelper.isKindAllowed(Expense, Refund)).toBe(false);
      expect(MyMoneyCategoryMappingHelper.isKindAllowed(Expense, MyMoneyCategoryKind.Income)).toBe(false);
      expect(MyMoneyCategoryMappingHelper.isKindAllowed(Expense, Transfer)).toBe(true);
    });

    it('allows income, transfer or refund for incomes', () => {
      expect(MyMoneyCategoryMappingHelper.isKindAllowed(Income, Consumption)).toBe(false);
      expect(MyMoneyCategoryMappingHelper.isKindAllowed(Income, Refund)).toBe(true);
    });
  });

  describe('planSync', () => {
    const categories = [
      category('loans-out', 'Loans', 'expense'),
      category('loans-in', 'Loans', 'income'),
      category('subs', 'Subscripción ', 'expense'),
    ];

    it('creates every category on the first sync without marking them for review', () => {
      const plan = MyMoneyCategoryMappingHelper.planSync([], categories);
      expect(plan.toRename).toEqual([]);
      expect(plan.toCreate).toHaveLength(3);
      expect(plan.toCreate.every(mapping => !mapping.needsReview)).toBe(true);
      // Loans gasto y Loans ingreso son categorías distintas en MyMoney
      expect(plan.toCreate.map(mapping => [mapping.categoryExternalId, mapping.movementType])).toEqual([
        ['loans-out', Expense],
        ['loans-in', Income],
        ['subs', Expense],
      ]);
      expect(plan.toCreate[2].categoryName).toBe('Subscripción');
    });

    it('marks categories that appear after the first sync for review', () => {
      const plan = MyMoneyCategoryMappingHelper.planSync(
        [{ id: 1, categoryExternalId: 'loans-out', categoryName: 'Loans' }],
        categories,
      );
      expect(plan.toCreate.map(mapping => mapping.categoryExternalId)).toEqual(['loans-in', 'subs']);
      expect(plan.toCreate.every(mapping => mapping.needsReview)).toBe(true);
    });

    it('renames a category without touching its classification', () => {
      const plan = MyMoneyCategoryMappingHelper.planSync(
        [
          { id: 1, categoryExternalId: 'loans-out', categoryName: 'Préstamos' },
          { id: 2, categoryExternalId: 'loans-in', categoryName: 'Loans' },
          { id: 3, categoryExternalId: 'subs', categoryName: 'Subscripción' },
          { id: 4, categoryExternalId: 'gone', categoryName: 'Borrada' },
        ],
        categories,
      );
      expect(plan.toCreate).toEqual([]);
      expect(plan.toRename).toEqual([{ id: 1, categoryName: 'Loans' }]);
    });
  });

  describe('matchesDescription', () => {
    it('matches the pattern at the start as a whole word, ignoring case and extra spaces', () => {
      expect(MyMoneyCategoryMappingHelper.matchesDescription('Ña 12', 'Ña 12 13/15')).toBe(true);
      expect(MyMoneyCategoryMappingHelper.matchesDescription('Ña 12', 'Ña 12/12')).toBe(true);
      expect(MyMoneyCategoryMappingHelper.matchesDescription('Aho3', 'aho3 6/12')).toBe(true);
      expect(MyMoneyCategoryMappingHelper.matchesDescription('Rueda', 'Rueda cu 37/60')).toBe(true);
      expect(MyMoneyCategoryMappingHelper.matchesDescription('ña  9', 'Ña 9')).toBe(true);
    });

    it('does not match a longer word or a pattern in the middle', () => {
      expect(MyMoneyCategoryMappingHelper.matchesDescription('Ña 1', 'Ña 12 13/15')).toBe(false);
      expect(MyMoneyCategoryMappingHelper.matchesDescription('Aho', 'Ahorro 15')).toBe(false);
      expect(MyMoneyCategoryMappingHelper.matchesDescription('Rueda', 'Cambio de rueda')).toBe(false);
      expect(MyMoneyCategoryMappingHelper.matchesDescription('', 'Rueda')).toBe(false);
    });
  });
});
