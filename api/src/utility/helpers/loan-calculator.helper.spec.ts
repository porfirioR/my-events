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
