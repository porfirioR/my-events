import { MyMoneyCashflowHelper, CashflowCategory, CashflowMovement, CashflowRule } from './mymoney-cashflow.helper';
import { MyMoneyCategoryKind, MyMoneyMovementTypeEnum } from '../enums';

const EXPENSE = MyMoneyMovementTypeEnum.Expense;
const INCOME = MyMoneyMovementTypeEnum.Income;

const category = (
  id: string,
  kind: MyMoneyCategoryKind,
  extra: Partial<CashflowCategory> = {},
): CashflowCategory => ({ categoryExternalId: id, kind, isEssential: false, isExtraordinary: false, savingsGoalId: null, ...extra });

const CATEGORIES: CashflowCategory[] = [
  category('salary', MyMoneyCategoryKind.Income),
  category('awards', MyMoneyCategoryKind.Income, { isExtraordinary: true }),
  category('refunds', MyMoneyCategoryKind.Refund),
  category('health', MyMoneyCategoryKind.Consumption, { isEssential: true }),
  category('outings', MyMoneyCategoryKind.Consumption),
  category('saving', MyMoneyCategoryKind.Transfer),
  category('investments', MyMoneyCategoryKind.Transfer, { savingsGoalId: 50 }),
  category('loans', MyMoneyCategoryKind.Transfer),
  category('ahorros', MyMoneyCategoryKind.Transfer),
];

const RULES: CashflowRule[] = [
  { pattern: 'Ña 9', savingsGoalId: 9 },
  { pattern: 'Ueno 6M', savingsGoalId: null }, // apunta a un préstamo
];

const movement = (date: string, movementType: number, amount: number, categoryExternalId: string, note = ''): CashflowMovement =>
  ({ date, movementType, amount, categoryExternalId, note });

describe('MyMoneyCashflowHelper', () => {
  it('returns the last complete months before the current one, oldest first', () => {
    expect(MyMoneyCashflowHelper.lastCompleteMonths('2026-11-23', 6))
      .toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
    expect(MyMoneyCashflowHelper.lastCompleteMonths('2026-02-10', 3)).toEqual(['2025-11', '2025-12', '2026-01']);
  });

  it('returns the date range of the months', () => {
    expect(MyMoneyCashflowHelper.range(['2026-01', '2026-02'])).toEqual({ from: '2026-01-01', to: '2026-02-28' });
    expect(MyMoneyCashflowHelper.range(['2026-01', '2026-02'], 7)).toEqual({ from: '2025-12-25', to: '2026-03-07' });
  });

  it('classifies a month: income without extraordinary, consumption minus refunds, essential and savings', () => {
    const summary = MyMoneyCashflowHelper.summarize([
      movement('2026-10-01', INCOME, 8_800_000, 'salary'),
      movement('2026-10-20', INCOME, 8_763_333, 'awards', 'Aguinaldo'),
      movement('2026-10-05', INCOME, 100_000, 'refunds'),
      movement('2026-10-01', EXPENSE, 792_000, 'health', 'IPS'),
      movement('2026-10-10', EXPENSE, 300_000, 'outings'),
      movement('2026-10-07', EXPENSE, 150_000, 'saving', 'Ña 9 7/12'),     // patrón → ahorro
      movement('2026-10-05', EXPENSE, 100_000, 'investments', 'Fondo mutuo'), // categoría → ahorro
      movement('2026-10-05', EXPENSE, 646_071, 'loans', 'Ueno 6M 3/12'),   // patrón → préstamo
      movement('2026-10-11', INCOME, 6_200_449, 'ahorros', 'CDA Ueno'),    // retiro: no resta
    ], CATEGORIES, RULES, ['2026-10']);

    expect(summary.months[0]).toMatchObject({
      income: 8_800_000,
      extraordinaryIncome: 8_763_333,
      consumption: 1_092_000,
      refunds: 100_000,
      netConsumption: 992_000,
      essentialExpense: 792_000,
      savingsContributions: 250_000,
      movementCount: 9,
    });
  });

  it('a contribution paid with money that came in as a transfer that week is not new savings', () => {
    const summary = MyMoneyCashflowHelper.summarize([
      movement('2026-06-22', INCOME, 6_000_000, 'loans', 'Ueno 6M'),         // desembolso del préstamo
      movement('2026-06-22', EXPENSE, 6_000_000, 'investments', 'CDA ueno'), // va a un CDA: no es ahorro nuevo
      movement('2026-06-01', EXPENSE, 250_000, 'investments', 'Fondo mutuo'),
    ], CATEGORIES, RULES, ['2026-06']);
    expect(summary.months[0]).toMatchObject({ savingsContributions: 250_000, movedSavings: 6_000_000 });
  });

  it('a transfer covers one contribution, only within a week and with the same amount', () => {
    const summary = MyMoneyCashflowHelper.summarize([
      movement('2026-04-28', INCOME, 1_000_000, 'ahorros', 'Ahorro Fijo'),       // cobro de un ahorro (mes anterior)
      movement('2026-05-02', EXPENSE, 1_000_000, 'investments', 'Fondo mutuo'), // reinvertido: se movió
      movement('2026-05-03', EXPENSE, 1_000_000, 'investments', 'Fondo mutuo'), // el cobro ya se usó: es ahorro
      movement('2026-05-20', EXPENSE, 999_999, 'investments', 'Fondo mutuo'),   // otro monto: es ahorro
    ], CATEGORIES, RULES, ['2026-05']);
    expect(summary.months[0]).toMatchObject({ savingsContributions: 1_999_999, movedSavings: 1_000_000 });

    const lateTransfer = MyMoneyCashflowHelper.summarize([
      movement('2026-05-01', EXPENSE, 500_000, 'investments', 'Fondo mutuo'),
      movement('2026-05-20', INCOME, 500_000, 'loans', 'Shir'), // más de una semana después: no se relaciona
    ], CATEGORIES, RULES, ['2026-05']);
    expect(lateTransfer.months[0].savingsContributions).toBe(500_000);
  });

  it('a transfer without a savings target (pattern or category) is not a savings contribution', () => {
    const summary = MyMoneyCashflowHelper.summarize(
      [movement('2026-10-03', EXPENSE, 250_000, 'saving', 'Ña 4 6/12')],
      CATEGORIES, RULES, ['2026-10'],
    );
    expect(summary.months[0].savingsContributions).toBe(0);
    expect(summary.months[0].consumption).toBe(0);
  });

  it('a category without mapping uses the default of its type', () => {
    const summary = MyMoneyCashflowHelper.summarize([
      movement('2026-10-03', EXPENSE, 50_000, 'unknown'),
      movement('2026-10-03', INCOME, 70_000, 'unknown-income'),
    ], CATEGORIES, RULES, ['2026-10']);
    expect(summary.months[0]).toMatchObject({ consumption: 50_000, income: 70_000 });
  });

  it('averages the months and is complete only when every month has movements', () => {
    const movements = [
      movement('2026-09-01', INCOME, 8_000_000, 'salary'),
      movement('2026-09-01', EXPENSE, 1_000_000, 'health'),
      movement('2026-10-01', INCOME, 10_000_000, 'salary'),
      movement('2026-10-01', EXPENSE, 2_000_001, 'health'),
      movement('2026-11-01', INCOME, 99_000_000, 'salary'), // fuera de los meses
    ];
    const complete = MyMoneyCashflowHelper.summarize(movements, CATEGORIES, RULES, ['2026-09', '2026-10']);
    expect(complete).toMatchObject({ complete: true, monthlyNetIncome: 9_000_000, monthlyEssentialExpense: 1_500_001 });

    const missingMonth = MyMoneyCashflowHelper.summarize(movements, CATEGORIES, RULES, ['2026-08', '2026-09', '2026-10']);
    expect(missingMonth.complete).toBe(false);
  });

  it('accepts amounts that arrive as strings from the database (NUMERIC)', () => {
    const summary = MyMoneyCashflowHelper.summarize(
      [movement('2026-10-01', INCOME, '8800000.00' as unknown as number, 'salary')],
      CATEGORIES, RULES, ['2026-10'],
    );
    expect(summary.monthlyNetIncome).toBe(8_800_000);
  });
});
