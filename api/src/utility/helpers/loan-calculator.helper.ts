import { AmortizationType } from '../enums/amortization-type.enum';
import { SavingsCalculatorHelper } from './savings-calculator.helper';

export interface LoanInstallmentSchedule {
  installmentNumber: number;
  dueDate: Date | null;
  totalAmount: number;
  principalAmount: number;
  interestAmount: number;
  remainingBalance: number;
}

export interface LoanCalculationResult {
  calculatedInstallmentAmount: number;
  calculatedTotalInterest: number;
  calculatedTotalAmount: number;
  schedule: LoanInstallmentSchedule[];
}

// Guaraní: la cuota 'flat' se redondea hacia arriba a múltiplos de 1.000
const GUARANI_CURRENCY_ID = 4;
const GUARANI_ROUNDING_STEP = 1000;

export class LoanCalculatorHelper {
  static calculate(
    principal: number,
    annualRatePercentage: number,
    numberOfInstallments: number,
    amortizationType: string,
    startDate: Date,
    totalRatePercentage: number | null = null,
    currencyId: number | null = null,
  ): LoanCalculationResult {
    if (amortizationType === AmortizationType.Flat) {
      const roundingStep = currencyId === GUARANI_CURRENCY_ID ? GUARANI_ROUNDING_STEP : 1;
      return this.calculateFlat(principal, totalRatePercentage ?? 0, numberOfInstallments, startDate, roundingStep);
    }
    if (amortizationType === AmortizationType.Simple) {
      return this.calculateSimple(principal, annualRatePercentage, numberOfInstallments, startDate);
    }
    return this.calculateFrench(principal, annualRatePercentage, numberOfInstallments, startDate);
  }

  static calculateFrench(
    principal: number,
    annualRatePercentage: number,
    numberOfInstallments: number,
    startDate: Date,
  ): LoanCalculationResult {
    const monthlyRate = annualRatePercentage / 100 / 12;
    let pmt: number;
    if (monthlyRate === 0) {
      pmt = principal / numberOfInstallments;
    } else {
      pmt =
        (principal * (monthlyRate * Math.pow(1 + monthlyRate, numberOfInstallments))) /
        (Math.pow(1 + monthlyRate, numberOfInstallments) - 1);
    }
    // Redondeo hacia abajo: la última cuota absorbe la diferencia hacia arriba
    // (ej. 1.000.000 en 3 al 0% → 333.333, 333.333, 333.334)
    const installmentAmount = Math.floor(pmt);
    const schedule: LoanInstallmentSchedule[] = [];
    let balance = principal;

    for (let i = 1; i <= numberOfInstallments; i++) {
      const interest = Math.round(balance * monthlyRate);
      const principalPaid =
        i < numberOfInstallments ? installmentAmount - interest : balance;
      const remaining = i < numberOfInstallments ? balance - principalPaid : 0;
      const dueDate = SavingsCalculatorHelper.addMonths(startDate, i);
      schedule.push({
        installmentNumber: i,
        dueDate,
        totalAmount: principalPaid + interest,
        principalAmount: principalPaid,
        interestAmount: interest,
        remainingBalance: remaining,
      });
      balance = remaining;
    }

    const totalPaid = schedule.reduce((s, x) => s + x.totalAmount, 0);
    return {
      calculatedInstallmentAmount: installmentAmount,
      calculatedTotalInterest: totalPaid - principal,
      calculatedTotalAmount: totalPaid,
      schedule,
    };
  }

  static calculateSimple(
    principal: number,
    annualRatePercentage: number,
    numberOfInstallments: number,
    startDate: Date,
  ): LoanCalculationResult {
    const totalInterest = Math.round(
      principal * (annualRatePercentage / 100) * (numberOfInstallments / 12),
    );
    const totalAmount = principal + totalInterest;
    // Redondeo hacia abajo: la última cuota absorbe la diferencia de capital e interés
    // (ej. 1.100.000 en 3 → 366.666, 366.666, 366.668)
    const principalPerInstallment = Math.floor(principal / numberOfInstallments);
    const interestPerInstallment = Math.floor(totalInterest / numberOfInstallments);
    const installmentAmount = principalPerInstallment + interestPerInstallment;
    const schedule: LoanInstallmentSchedule[] = [];
    let balance = principal;

    for (let i = 1; i <= numberOfInstallments; i++) {
      const principalPaid = i < numberOfInstallments ? principalPerInstallment : balance;
      const interest = i < numberOfInstallments
        ? interestPerInstallment
        : totalInterest - interestPerInstallment * (numberOfInstallments - 1);
      const remaining = i < numberOfInstallments ? balance - principalPaid : 0;
      const dueDate = SavingsCalculatorHelper.addMonths(startDate, i);
      schedule.push({
        installmentNumber: i,
        dueDate,
        totalAmount: principalPaid + interest,
        principalAmount: principalPaid,
        interestAmount: interest,
        remainingBalance: remaining,
      });
      balance = remaining;
    }

    return {
      calculatedInstallmentAmount: installmentAmount,
      calculatedTotalInterest: totalInterest,
      calculatedTotalAmount: totalAmount,
      schedule,
    };
  }

  // Tasa total sobre el capital (préstamos entre personas). La cuota se redondea hacia
  // arriba y pasa a ser la cuota real: todas las cuotas son iguales y el redondeo queda
  // como interés (ej. 508.000 al 5% en 2 → 266.700 → 267.000, total 534.000, interés 26.000)
  static calculateFlat(
    principal: number,
    totalRatePercentage: number,
    numberOfInstallments: number,
    startDate: Date,
    roundingStep: number,
  ): LoanCalculationResult {
    const interest = Math.round(principal * (totalRatePercentage / 100));
    const installmentAmount = Math.ceil((principal + interest) / numberOfInstallments / roundingStep) * roundingStep;
    const totalAmount = installmentAmount * numberOfInstallments;
    const principalPerInstallment = Math.floor(principal / numberOfInstallments);
    const schedule: LoanInstallmentSchedule[] = [];
    let balance = principal;

    for (let i = 1; i <= numberOfInstallments; i++) {
      const principalPaid = i < numberOfInstallments ? principalPerInstallment : balance;
      const remaining = balance - principalPaid;
      schedule.push({
        installmentNumber: i,
        dueDate: SavingsCalculatorHelper.addMonths(startDate, i),
        totalAmount: installmentAmount,
        principalAmount: principalPaid,
        interestAmount: installmentAmount - principalPaid,
        remainingBalance: remaining,
      });
      balance = remaining;
    }

    return {
      calculatedInstallmentAmount: installmentAmount,
      calculatedTotalInterest: totalAmount - principal,
      calculatedTotalAmount: totalAmount,
      schedule,
    };
  }

  // Tasa anual equivalente de una tasa total 'flat' (solo informativa)
  static toEquivalentAnnualRate(totalRatePercentage: number, numberOfInstallments: number): number {
    return Math.round((totalRatePercentage * 12 / numberOfInstallments) * 100) / 100;
  }
}
