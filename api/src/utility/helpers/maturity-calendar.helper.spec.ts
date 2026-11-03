import { MaturityCalendarHelper, MaturityInstallmentInput, MaturityLoanInput, MaturitySavingsInput } from './maturity-calendar.helper';
import { LoanDirection, MaturityEventType, ProgressionType } from '../enums';

const GUARANI = 4;
const DOLLAR = 1;
const TODAY = '2026-11-02';

const savings = (overrides: Partial<MaturitySavingsInput>): MaturitySavingsInput => ({
  id: 1,
  name: 'Ahorro',
  institutionId: 5,
  currencyId: GUARANI,
  progressionTypeId: ProgressionType.Fixed,
  statusId: 1,
  targetAmount: 1_000,
  currentAmount: 500,
  expectedEndDate: '2027-01-15',
  payoutDate: null,
  plannedDestination: null,
  ...overrides,
});

const loan = (overrides: Partial<MaturityLoanInput>): MaturityLoanInput => ({
  id: 10,
  name: 'Préstamo',
  institutionId: 1,
  lenderCustomName: null,
  currencyId: GUARANI,
  direction: LoanDirection.Borrowed,
  statusId: 1,
  expectedEndDate: '2027-06-10',
  installmentAmount: 300,
  ...overrides,
});

const installment = (loanId: number, dueDate: string, totalAmount = 100): MaturityInstallmentInput => ({ loanId, dueDate, totalAmount });

const build = (input: Partial<Parameters<typeof MaturityCalendarHelper.build>[0]>, months = 12) =>
  MaturityCalendarHelper.build({ savings: [], loans: [], installments: [], ...input }, TODAY, months);

const monthOf = (result: ReturnType<typeof build>, month: string) => result.months.find(m => m.month === month);

describe('MaturityCalendarHelper', () => {
  it('returns one entry per month starting at the current month, crossing the year', () => {
    const result = build({});
    expect(result.months.map(m => m.month)).toEqual([
      '2026-11', '2026-12', '2027-01', '2027-02', '2027-03', '2027-04',
      '2027-05', '2027-06', '2027-07', '2027-08', '2027-09', '2027-10',
    ]);
    expect(result.months.every(m => m.events.length === 0 && m.totals.length === 0)).toBe(true);
  });

  it('places savings maturities in their month with the amount at maturity and the planned destination', () => {
    const result = build({
      savings: [savings({ name: 'Ña 12', expectedEndDate: '2027-10-04', targetAmount: 12_000, plannedDestination: 'CDA' })],
    });
    const october = monthOf(result, '2027-10');
    expect(october.events).toHaveLength(1);
    expect(october.events[0]).toMatchObject({
      type: MaturityEventType.SavingsMaturity, name: 'Ña 12', amount: 12_000, plannedDestination: 'CDA',
    });
    expect(october.totals).toEqual([{ currencyId: GUARANI, amount: 12_000 }]);
  });

  it('uses the estimated payout date for rotating savings', () => {
    const result = build({
      savings: [savings({ progressionTypeId: ProgressionType.Rotating, expectedEndDate: '2027-03-01', payoutDate: '2027-02-15', targetAmount: 13_200 })],
    });
    expect(monthOf(result, '2027-02').events[0]).toMatchObject({ type: MaturityEventType.RotatingPayout, amount: 13_200 });
    expect(monthOf(result, '2027-03').events).toHaveLength(0);
  });

  it('skips mutual funds, withdrawn and cancelled savings, and savings without a date', () => {
    const result = build({
      savings: [
        savings({ progressionTypeId: ProgressionType.MutualFund }),
        savings({ statusId: 4 }),
        savings({ statusId: 5 }),
        savings({ expectedEndDate: null }),
      ],
    });
    expect(result.months.flatMap(m => m.events)).toHaveLength(0);
    expect(result.overdue).toHaveLength(0);
  });

  it('uses what was saved when it is more than the target (free form goals)', () => {
    const result = build({ savings: [savings({ targetAmount: 0, currentAmount: 800 })] });
    expect(monthOf(result, '2027-01').events[0].amount).toBe(800);
  });

  it('lists lent loan installments as collections and borrowed loan ends without adding them to the totals', () => {
    const lent = loan({ id: 20, name: 'Préstamo a Juan', direction: LoanDirection.Lent, lenderCustomName: 'Juan' });
    const borrowed = loan({ id: 21, name: 'Ueno', expectedEndDate: '2026-12-10', installmentAmount: 500 });
    const result = build({
      loans: [lent, borrowed],
      installments: [installment(20, '2026-12-05', 250), installment(21, '2026-12-10', 500)],
    });
    const december = monthOf(result, '2026-12');
    expect(december.events.map(e => e.type)).toEqual([MaturityEventType.LentCollection, MaturityEventType.LoanEnd]);
    expect(december.events[0]).toMatchObject({ amount: 250, lenderCustomName: 'Juan' });
    // La cuota del préstamo que debo no es un evento y el fin del préstamo no suma al total
    expect(december.totals).toEqual([{ currencyId: GUARANI, amount: 250 }]);
  });

  it('moves past maturities and late lent installments to overdue, but not past loan ends', () => {
    const result = build({
      savings: [savings({ name: 'Vencido', statusId: 2, expectedEndDate: '2026-10-01' })],
      loans: [
        loan({ id: 20, direction: LoanDirection.Lent }),
        loan({ id: 21, expectedEndDate: '2026-10-01' }),
      ],
      installments: [installment(20, '2026-11-01')],
    });
    expect(result.overdue.map(e => e.type)).toEqual([MaturityEventType.SavingsMaturity, MaturityEventType.LentCollection]);
    expect(result.months.flatMap(m => m.events)).toHaveLength(0);
  });

  it('ignores events after the last month and installments of finished loans', () => {
    const result = build({
      savings: [savings({ expectedEndDate: '2027-11-01' })],
      loans: [loan({ id: 20, direction: LoanDirection.Lent, statusId: 2 })],
      installments: [installment(20, '2026-12-01')],
    });
    expect(result.months.flatMap(m => m.events)).toHaveLength(0);
  });

  it('keeps totals separated by currency', () => {
    const result = build({
      savings: [
        savings({ id: 1, expectedEndDate: '2027-01-10', targetAmount: 1_000 }),
        savings({ id: 2, expectedEndDate: '2027-01-20', targetAmount: 50, currentAmount: 20, currencyId: DOLLAR }),
      ],
    });
    expect(monthOf(result, '2027-01').totals).toEqual([
      { currencyId: DOLLAR, amount: 50 },
      { currencyId: GUARANI, amount: 1_000 },
    ]);
  });

  it('counts an event due today as upcoming, not overdue', () => {
    const result = build({ savings: [savings({ expectedEndDate: TODAY })] });
    expect(result.overdue).toHaveLength(0);
    expect(monthOf(result, '2026-11').events).toHaveLength(1);
  });
});
