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

export class LoanCalculatorHelper {
  static calculate(
    principal: number,
    annualRatePercentage: number,
    numberOfInstallments: number,
    amortizationType: string,
    startDate: Date,
  ): LoanCalculationResult {
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
    const installmentAmount = Math.round(pmt);
    const schedule: LoanInstallmentSchedule[] = [];
    let balance = principal;

    for (let i = 1; i <= numberOfInstallments; i++) {
      const interest = Math.round(balance * monthlyRate);
      const principalPaid =
        i < numberOfInstallments ? Math.round(pmt) - interest : balance;
      const remaining = i < numberOfInstallments ? balance - principalPaid : 0;
      const dueDate = SavingsCalculatorHelper.addMonths(startDate, i - 1);
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
    const installmentAmount = Math.round(totalAmount / numberOfInstallments);
    const principalPerInstallment = Math.round(principal / numberOfInstallments);
    const interestPerInstallment = Math.round(totalInterest / numberOfInstallments);
    const schedule: LoanInstallmentSchedule[] = [];
    let balance = principal;

    for (let i = 1; i <= numberOfInstallments; i++) {
      const principalPaid = i < numberOfInstallments ? principalPerInstallment : balance;
      const interest = interestPerInstallment;
      const remaining = i < numberOfInstallments ? balance - principalPaid : 0;
      const dueDate = SavingsCalculatorHelper.addMonths(startDate, i - 1);
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
}
