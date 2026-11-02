import { NetWorthCalculatorHelper, NetWorthAccountInput, NetWorthLoanInput, NetWorthSavingsInput } from './net-worth-calculator.helper';
import { LoanDirection, NetWorthItemType, NetWorthLiquidity, ProgressionType } from '../enums';

const GUARANI = 4;
const DOLLAR = 1;
const UENO = 1;
const ITAU = 2;
const COOP = 5;
const CASH = 6;

const account = (institutionId: number, balance: number, currencyId = GUARANI): NetWorthAccountInput =>
  ({ institutionId, currencyId, balance });

const savings = (
  institutionId: number | null,
  currentAmount: number,
  progressionTypeId = ProgressionType.CDA,
  statusId = 1,
  currencyId = GUARANI,
): NetWorthSavingsInput => ({ institutionId, currencyId, progressionTypeId, statusId, currentAmount });

const loan = (
  institutionId: number,
  currentBalance: number,
  direction = LoanDirection.Borrowed,
  statusId = 1,
  currencyId = GUARANI,
): NetWorthLoanInput => ({ institutionId, currencyId, direction, statusId, currentBalance });

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
    expect(ueno).toEqual({ institutionId: UENO, assets: 3_000, liabilities: 1_500, total: 1_500 });
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
});
