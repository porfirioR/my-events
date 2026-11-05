import { NetWorthCalculatorHelper, NetWorthAccountInput, NetWorthLoanInput, NetWorthSavingsInput } from './net-worth-calculator.helper';
import { LoanDirection, NetWorthItemType, NetWorthLiquidity, ProgressionType } from '../enums';

const GUARANI = 4;
const DOLLAR = 1;
const UENO = 1;
const ITAU = 2;
const COOP = 5;
const CASH = 6;

let nextId = 1;

const account = (institutionId: number, balance: number, currencyId = GUARANI, name = 'Account'): NetWorthAccountInput =>
  ({ id: nextId++, name, institutionId, currencyId, balance });

const savings = (
  institutionId: number | null,
  currentAmount: number,
  progressionTypeId = ProgressionType.CDA,
  statusId = 1,
  currencyId = GUARANI,
  dates: { expectedEndDate?: string; payoutDate?: string; name?: string } = {},
): NetWorthSavingsInput => ({
  id: nextId++,
  name: dates.name ?? 'Savings',
  institutionId,
  currencyId,
  progressionTypeId,
  statusId,
  currentAmount,
  expectedEndDate: dates.expectedEndDate ?? null,
  payoutDate: dates.payoutDate ?? null,
});

const loan = (
  institutionId: number,
  currentBalance: number,
  direction = LoanDirection.Borrowed,
  statusId = 1,
  currencyId = GUARANI,
  expectedEndDate: string | null = null,
): NetWorthLoanInput => ({ id: nextId++, name: 'Loan', institutionId, currencyId, direction, statusId, currentBalance, expectedEndDate });

const liquidityOf = (result: ReturnType<typeof NetWorthCalculatorHelper.calculate>[number], liquidity: NetWorthLiquidity) =>
  result.byLiquidity.find(l => l.liquidity === liquidity).amount;

const typeOf = (result: ReturnType<typeof NetWorthCalculatorHelper.calculate>[number], type: NetWorthItemType) =>
  result.byType.find(t => t.type === type).amount;

describe('NetWorthCalculatorHelper', () => {
  it('returns no currencies when there is nothing to count', () => {
    expect(NetWorthCalculatorHelper.calculate({ accounts: [], savings: [], loans: [] })).toEqual([]);
  });

  it('adds accounts, savings and lent loans as assets and subtracts borrowed loans', () => {
    const [result] = NetWorthCalculatorHelper.calculate({
      accounts: [account(ITAU, 1_000_000), account(CASH, 200_000)],
      savings: [savings(UENO, 5_000_000)],
      loans: [loan(UENO, 3_000_000), loan(3, 500_000, LoanDirection.Lent)],
    });

    expect(result.currencyId).toBe(GUARANI);
    expect(result.assets).toBe(6_700_000);
    expect(result.liabilities).toBe(3_000_000);
    expect(result.total).toBe(3_700_000);
  });

  it('keeps each currency separate', () => {
    const results = NetWorthCalculatorHelper.calculate({
      accounts: [account(UENO, 1_000_000), account(UENO, 500, DOLLAR)],
      savings: [],
      loans: [],
    });

    expect(results.map(r => [r.currencyId, r.total])).toEqual([[DOLLAR, 500], [GUARANI, 1_000_000]]);
  });

  it('classifies liquidity: accounts and withdrawable goals immediate, mutual fund days, term savings locked, lent loans receivable', () => {
    const [result] = NetWorthCalculatorHelper.calculate({
      accounts: [account(ITAU, 100)],
      savings: [
        savings(UENO, 200, ProgressionType.MutualFund),
        savings(UENO, 300, ProgressionType.FixedDeposit),
        savings(COOP, 400, ProgressionType.Fixed),
        savings(COOP, 500, ProgressionType.Rotating),
      ],
      loans: [loan(3, 600, LoanDirection.Lent), loan(UENO, 700)],
    });

    expect(liquidityOf(result, NetWorthLiquidity.Immediate)).toBe(500); // cuenta + meta fija
    expect(liquidityOf(result, NetWorthLiquidity.Days)).toBe(200);
    expect(liquidityOf(result, NetWorthLiquidity.Locked)).toBe(800);    // plazo fijo + rueda
    expect(liquidityOf(result, NetWorthLiquidity.Receivable)).toBe(600);
    // La deuda no es liquidez: la suma de liquideces son solo los activos
    expect(result.byLiquidity.reduce((s, l) => s + l.amount, 0)).toBe(result.assets);
  });

  it.each([
    [ProgressionType.Fixed, NetWorthLiquidity.Immediate],
    [ProgressionType.Ascending, NetWorthLiquidity.Immediate],
    [ProgressionType.Descending, NetWorthLiquidity.Immediate],
    [ProgressionType.Random, NetWorthLiquidity.Immediate],
    [ProgressionType.FreeForm, NetWorthLiquidity.Immediate],
    [ProgressionType.MutualFund, NetWorthLiquidity.Days],
    [ProgressionType.Scheduled, NetWorthLiquidity.Locked],
    [ProgressionType.FixedDeposit, NetWorthLiquidity.Locked],
    [ProgressionType.CDA, NetWorthLiquidity.Locked],
    [ProgressionType.Rotating, NetWorthLiquidity.Locked],
    [99, NetWorthLiquidity.Locked], // tipo desconocido: conservador
  ])('savings type %i has liquidity %i', (progressionTypeId, liquidity) => {
    expect(NetWorthCalculatorHelper.getSavingsLiquidity(progressionTypeId)).toBe(liquidity);
  });

  it('groups by type', () => {
    const [result] = NetWorthCalculatorHelper.calculate({
      accounts: [account(ITAU, 100), account(CASH, 50)],
      savings: [savings(UENO, 200)],
      loans: [loan(3, 300, LoanDirection.Lent), loan(UENO, 400)],
    });

    expect(typeOf(result, NetWorthItemType.Account)).toBe(150);
    expect(typeOf(result, NetWorthItemType.Savings)).toBe(200);
    expect(typeOf(result, NetWorthItemType.LentLoan)).toBe(300);
    expect(typeOf(result, NetWorthItemType.BorrowedLoan)).toBe(400);
  });

  it('groups by institution with assets, liabilities and net total', () => {
    const [result] = NetWorthCalculatorHelper.calculate({
      accounts: [account(UENO, 1_000), account(ITAU, 300)],
      savings: [savings(UENO, 2_000), savings(null, 50)],
      loans: [loan(UENO, 1_500)],
    });

    const ueno = result.byInstitution.find(i => i.institutionId === UENO);
    expect(ueno).toMatchObject({ institutionId: UENO, assets: 3_000, liabilities: 1_500, total: 1_500 });
    expect(result.byInstitution.find(i => i.institutionId === ITAU).total).toBe(300);
    // Ahorros sin entidad quedan en su propio grupo
    expect(result.byInstitution.find(i => i.institutionId === null).assets).toBe(50);
    // Ordenado de mayor a menor activo
    expect(result.byInstitution.map(i => i.institutionId)).toEqual([UENO, ITAU, null]);
  });

  it('ignores cancelled and withdrawn savings but keeps completed and paused ones', () => {
    const [result] = NetWorthCalculatorHelper.calculate({
      accounts: [],
      savings: [
        savings(UENO, 100, ProgressionType.CDA, 1), // Active
        savings(UENO, 200, ProgressionType.CDA, 2), // Completed: la plata sigue en la entidad
        savings(UENO, 400, ProgressionType.CDA, 3), // Paused
        savings(UENO, 800, ProgressionType.CDA, 4), // Cancelled
        savings(UENO, 1_600, ProgressionType.CDA, 5), // Withdrawn: ya se cobró
      ],
      loans: [],
    });

    expect(result.assets).toBe(700);
  });

  it('ignores completed and cancelled loans and loans with no balance left', () => {
    const results = NetWorthCalculatorHelper.calculate({
      accounts: [],
      savings: [],
      loans: [
        loan(UENO, 1_000, LoanDirection.Borrowed, 2), // Completed
        loan(UENO, 1_000, LoanDirection.Borrowed, 4), // Cancelled
        loan(UENO, 0, LoanDirection.Borrowed, 1),     // Active sin saldo
      ],
    });

    expect(results).toEqual([]);
  });

  it('subtracts a negative account balance (overdraft) from assets', () => {
    const [result] = NetWorthCalculatorHelper.calculate({
      accounts: [account(ITAU, 1_000), account(UENO, -300)],
      savings: [],
      loans: [],
    });

    expect(result.assets).toBe(700);
    expect(liquidityOf(result, NetWorthLiquidity.Immediate)).toBe(700);
  });

  it('accepts amounts that arrive as strings from the database (BIGINT)', () => {
    const [result] = NetWorthCalculatorHelper.calculate({
      accounts: [account(ITAU, '1000' as unknown as number)],
      savings: [savings(UENO, '2000' as unknown as number)],
      loans: [],
    });

    expect(result.assets).toBe(3_000);
  });

  describe('breakdown by institution', () => {
    const build = () => NetWorthCalculatorHelper.calculate({
      accounts: [account(COOP, 2_000_000, GUARANI, 'CU vista')],
      savings: [
        savings(COOP, 3_000_000, ProgressionType.FreeForm, 1, GUARANI, { name: 'Ahorro Casa' }),
        savings(COOP, 13_200_000, ProgressionType.Rotating, 2, GUARANI, { name: 'Rueda CU', expectedEndDate: '2026-11-01', payoutDate: '2027-06-01' }),
        savings(COOP, 1_200_000, ProgressionType.Scheduled, 1, GUARANI, { name: 'Ña 9', expectedEndDate: '2027-04-01' }),
        savings(UENO, 1_000_000, ProgressionType.MutualFund, 1, GUARANI, { name: 'Fondo', expectedEndDate: '2027-01-01' }),
      ],
      loans: [loan(UENO, 4_000_000), loan(3, 500_000, LoanDirection.Lent, 1, GUARANI, '2027-02-05')],
    })[0];

    it('splits each institution by liquidity and the parts add up to its assets and to the global totals', () => {
      const result = build();
      const coop = result.byInstitution.find(i => i.institutionId === COOP);
      expect(coop.byLiquidity).toEqual([
        { liquidity: NetWorthLiquidity.Immediate, amount: 5_000_000 },
        { liquidity: NetWorthLiquidity.Days, amount: 0 },
        { liquidity: NetWorthLiquidity.Locked, amount: 14_400_000 },
        { liquidity: NetWorthLiquidity.Receivable, amount: 0 },
      ]);
      result.byInstitution.forEach(i =>
        expect(i.byLiquidity.reduce((s, l) => s + l.amount, 0)).toBe(i.assets));
      result.byLiquidity.forEach(l => {
        const fromInstitutions = result.byInstitution
          .reduce((s, i) => s + i.byLiquidity.find(x => x.liquidity === l.liquidity).amount, 0);
        expect(fromInstitutions).toBe(l.amount);
      });
    });

    it('lists the items of each institution, most liquid first and larger amounts first', () => {
      const coop = build().byInstitution.find(i => i.institutionId === COOP);
      expect(coop.items.map(i => i.name)).toEqual(['Ahorro Casa', 'CU vista', 'Rueda CU', 'Ña 9']);
      expect(coop.items[1]).toMatchObject({ type: NetWorthItemType.Account, liquidity: NetWorthLiquidity.Immediate, amount: 2_000_000 });
    });

    it('keeps debts as items without liquidity, after the assets', () => {
      const ueno = build().byInstitution.find(i => i.institutionId === UENO);
      expect(ueno.items.map(i => [i.type, i.liquidity])).toEqual([
        [NetWorthItemType.Savings, NetWorthLiquidity.Days],
        [NetWorthItemType.BorrowedLoan, null],
      ]);
      expect(ueno.byLiquidity.reduce((s, l) => s + l.amount, 0)).toBe(1_000_000);
      expect(ueno.liabilities).toBe(4_000_000);
    });

    it('gives an available date only to locked savings (rotating uses its payout date) and lent loans', () => {
      const result = build();
      const items = result.byInstitution.flatMap(i => i.items);
      const dateOf = (name: string) => items.find(i => i.name === name).availableDate;
      expect(dateOf('Rueda CU')).toBe('2027-06-01');
      expect(dateOf('Ña 9')).toBe('2027-04-01');
      expect(dateOf('Fondo')).toBeNull();       // fondo mutuo: se rescata en días
      expect(dateOf('Ahorro Casa')).toBeNull();
      expect(dateOf('CU vista')).toBeNull();
      const loans = items.filter(i => i.name === 'Loan');
      expect(loans.find(i => i.type === NetWorthItemType.LentLoan).availableDate).toBe('2027-02-05');
      expect(loans.find(i => i.type === NetWorthItemType.BorrowedLoan).availableDate).toBeNull();
    });

    it('has no available date for a rotating savings without payout date, even if its installments ended', () => {
      const [result] = NetWorthCalculatorHelper.calculate({
        accounts: [],
        savings: [savings(COOP, 100, ProgressionType.Rotating, 1, GUARANI, { expectedEndDate: '2027-03-01' })],
        loans: [],
      });
      expect(result.byInstitution[0].items[0].availableDate).toBeNull();
    });
  });
});
