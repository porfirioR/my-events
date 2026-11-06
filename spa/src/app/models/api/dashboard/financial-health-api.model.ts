// Indicadores de salud financiera (#228). Por ahora solo en guaraníes.

export type HealthStatus = 'good' | 'warning' | 'bad';

export interface HealthThresholdsApiModel {
  cushionGreenMonths: number;
  cushionYellowMonths: number;
  savingsGreenPercentage: number;
  savingsYellowPercentage: number;
  // En cuotas, más bajo es mejor
  debtGreenPercentage: number;
  debtYellowPercentage: number;
}

export interface FinancialSettingsApiModel {
  currencyId: number;
  monthlyNetIncome: number | null;
  monthlyEssentialExpense: number | null;
  thresholds: HealthThresholdsApiModel;
}

export interface HealthIndicatorApiModel {
  // null si falta el parámetro para calcularlo
  value: number | null;
  status: HealthStatus | null;
}

export interface FinancialHealthApiModel {
  currencyId: number;
  liquidImmediate: number;
  monthlySavingsContributions: number;
  monthlyLoanInstallments: number;
  monthlyNetIncome: number | null;
  monthlyEssentialExpense: number | null;
  cushionMonths: HealthIndicatorApiModel;
  savingsRate: HealthIndicatorApiModel;
  debtRate: HealthIndicatorApiModel;
  thresholds: HealthThresholdsApiModel;
}

export class UpsertFinancialSettingsApiRequest {
  constructor(
    public monthlyNetIncome: number | null,
    public monthlyEssentialExpense: number | null,
    public cushionGreenMonths: number,
    public cushionYellowMonths: number,
    public savingsGreenPercentage: number,
    public savingsYellowPercentage: number,
    public debtGreenPercentage: number,
    public debtYellowPercentage: number,
  ) {}
}
