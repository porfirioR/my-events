import { FinancialHealthHelper, FinancialHealthInput, HealthThresholds } from './financial-health.helper';

const DEFAULTS: HealthThresholds = {
  cushionGreenMonths: 6,
  cushionYellowMonths: 3,
  savingsGreenPercentage: 20,
  savingsYellowPercentage: 10,
  debtGreenPercentage: 30,
  debtYellowPercentage: 40,
};

const input = (overrides: Partial<FinancialHealthInput> = {}): FinancialHealthInput => ({
  liquidImmediate: 16_862_303,
  monthlySavingsContributions: 1_500_000,
  monthlyLoanInstallments: 646_071,
  monthlyNetIncome: 10_000_000,
  monthlyEssentialExpense: 4_000_000,
  thresholds: DEFAULTS,
  ...overrides,
});

describe('FinancialHealthHelper.calculate', () => {
  it('calculates the three indicators with one decimal', () => {
    const result = FinancialHealthHelper.calculate(input());
    expect(result.cushionMonths).toEqual({ value: 4.2, status: 'warning' });
    expect(result.savingsRate).toEqual({ value: 15, status: 'warning' });
    expect(result.debtRate).toEqual({ value: 6.5, status: 'good' });
  });

  it.each([
    [24_000_000, 'good'],    // 6 meses justos
    [12_000_000, 'warning'], // 3 meses justos
    [11_999_999, 'bad'],
  ])('cushion of %d over 4.000.000 is %s', (liquid, status) => {
    expect(FinancialHealthHelper.calculate(input({ liquidImmediate: liquid })).cushionMonths.status).toBe(status);
  });

  it.each([
    [2_000_000, 'good'],
    [1_000_000, 'warning'],
    [999_000, 'bad'],
  ])('savings contributions of %d over 10.000.000 are %s', (contributions, status) => {
    expect(FinancialHealthHelper.calculate(input({ monthlySavingsContributions: contributions })).savingsRate.status).toBe(status);
  });

  it.each([
    [3_000_000, 'good'],    // 30% justo
    [4_000_000, 'warning'], // 40% justo
    [4_001_000, 'bad'],
  ])('loan installments of %d over 10.000.000 are %s (lower is better)', (installments, status) => {
    expect(FinancialHealthHelper.calculate(input({ monthlyLoanInstallments: installments })).debtRate.status).toBe(status);
  });

  it('leaves the cushion empty without essential expense', () => {
    const result = FinancialHealthHelper.calculate(input({ monthlyEssentialExpense: null }));
    expect(result.cushionMonths).toEqual({ value: null, status: null });
    expect(result.savingsRate.value).toBe(15);
  });

  it('leaves both rates empty without net income', () => {
    const result = FinancialHealthHelper.calculate(input({ monthlyNetIncome: null }));
    expect(result.savingsRate).toEqual({ value: null, status: null });
    expect(result.debtRate).toEqual({ value: null, status: null });
    expect(result.cushionMonths.value).toBe(4.2);
  });

  it('treats a negative liquid balance as zero months', () => {
    expect(FinancialHealthHelper.calculate(input({ liquidImmediate: -500_000 })).cushionMonths).toEqual({ value: 0, status: 'bad' });
  });

  it('without contributions or installments the rates are zero', () => {
    const result = FinancialHealthHelper.calculate(input({ monthlySavingsContributions: 0, monthlyLoanInstallments: 0 }));
    expect(result.savingsRate).toEqual({ value: 0, status: 'bad' });
    expect(result.debtRate).toEqual({ value: 0, status: 'good' });
  });

  it('uses custom thresholds', () => {
    const thresholds = { ...DEFAULTS, cushionGreenMonths: 4, cushionYellowMonths: 2 };
    expect(FinancialHealthHelper.calculate(input({ thresholds })).cushionMonths.status).toBe('good');
  });
});

describe('FinancialHealthHelper.monthRange', () => {
  it.each([
    ['2026-11-06', '2026-11-01', '2026-11-30'],
    ['2026-12-31', '2026-12-01', '2026-12-31'],
    ['2028-02-10', '2028-02-01', '2028-02-29'],
  ])('%s → %s..%s', (today, from, to) => {
    expect(FinancialHealthHelper.monthRange(today)).toEqual({ from, to });
  });
});
