import { LoanCalculatorHelper } from './loan-calculator.helper';

const START = new Date(Date.UTC(2026, 6, 5));

describe('LoanCalculatorHelper.applyActualAmounts', () => {
  // Préstamo Ueno: 6.000.000 en 12 cuotas al 22,71% TAN; el banco cobra 646.071 (última 649.382)
  const calc = LoanCalculatorHelper.calculateFrench(6_000_000, 22.71, 12, START);

  it('uses the actual installment and lets the last one absorb the difference to the actual total', () => {
    const schedule = LoanCalculatorHelper.applyActualAmounts(calc.schedule, 646_071, 7_756_163);
    expect(schedule.slice(0, 11).every(s => s.totalAmount === 646_071)).toBe(true);
    expect(schedule[11].totalAmount).toBe(649_382);
    expect(schedule.reduce((sum, s) => sum + s.totalAmount, 0)).toBe(7_756_163);
  });

  it('keeps principal and balance from the formula and adds the extra cost to interest', () => {
    const schedule = LoanCalculatorHelper.applyActualAmounts(calc.schedule, 646_071, 7_756_163);
    schedule.forEach((s, i) => {
      expect(s.principalAmount).toBe(calc.schedule[i].principalAmount);
      expect(s.remainingBalance).toBe(calc.schedule[i].remainingBalance);
      expect(s.principalAmount + s.interestAmount).toBe(s.totalAmount);
    });
    expect(schedule.reduce((sum, s) => sum + s.principalAmount, 0)).toBe(6_000_000);
  });

  it('without actual total every installment uses the actual amount', () => {
    const schedule = LoanCalculatorHelper.applyActualAmounts(calc.schedule, 600_000, null);
    expect(schedule.every(s => s.totalAmount === 600_000)).toBe(true);
  });

  it('without actual installment the formula schedule is kept', () => {
    expect(LoanCalculatorHelper.applyActualAmounts(calc.schedule, null, 7_756_163)).toBe(calc.schedule);
  });
});

describe('LoanCalculatorHelper.calculateFlat', () => {
  // Redondeo guaraní: hacia arriba a múltiplos de 500
  it.each([
    [508_000, 266_700, 267_000],
    [500_000, 262_500, 262_500],
    [506_000, 265_650, 266_000],
    [502_000, 263_550, 264_000],
    [504_000, 264_600, 265_000],
  ])('rounds %d at 5%% in 2 (%d) up to %d', (principal, _raw, expected) => {
    const calc = LoanCalculatorHelper.calculateFlat(principal, 5, 2, START, 500);
    expect(calc.calculatedInstallmentAmount).toBe(expected);
    expect(calc.calculatedTotalAmount).toBe(expected * 2);
    expect(calc.calculatedTotalInterest).toBe(expected * 2 - principal);
  });

  // Igual que la planilla: resto 0 queda, resto 1–500 sube a 500, resto 501–999 sube a 1.000
  it.each([
    [263_000, 263_000],
    [263_001, 263_500],
    [263_300, 263_500],
    [263_500, 263_500],
    [263_501, 264_000],
    [263_999, 264_000],
  ])('rounds an installment of %d up to %d', (installment, expected) => {
    const calc = LoanCalculatorHelper.calculateFlat(installment, 0, 1, START, 500);
    expect(calc.calculatedInstallmentAmount).toBe(expected);
  });

  it('keeps every installment equal and principal summing to the loan', () => {
    const calc = LoanCalculatorHelper.calculateFlat(508_000, 5, 2, START, 500);
    expect(calc.schedule.every(s => s.totalAmount === 267_000)).toBe(true);
    expect(calc.schedule.reduce((sum, s) => sum + s.principalAmount, 0)).toBe(508_000);
  });

  it('applies the guaraní step through calculate()', () => {
    const calc = LoanCalculatorHelper.calculate(500_000, 0, 2, 'flat', START, 5, 4);
    expect(calc.calculatedInstallmentAmount).toBe(262_500);
  });
});
