import { HealthStatus } from '../../../utility/helpers/financial-health.helper';

export class HealthThresholdsModel {
  constructor(
    public readonly cushionGreenMonths: number,
    public readonly cushionYellowMonths: number,
    public readonly savingsGreenPercentage: number,
    public readonly savingsYellowPercentage: number,
    public readonly debtGreenPercentage: number,
    public readonly debtYellowPercentage: number,
  ) {}
}

// Parámetros manuales del perfil para los indicadores (si no se cargaron, vienen los valores por defecto)
export class FinancialSettingsModel {
  constructor(
    public readonly currencyId: number,
    public readonly monthlyNetIncome: number | null,
    public readonly monthlyEssentialExpense: number | null,
    public readonly thresholds: HealthThresholdsModel,
  ) {}
}

export class HealthIndicatorModel {
  constructor(
    // null si falta el parámetro para calcularlo
    public readonly value: number | null,
    public readonly status: HealthStatus | null,
  ) {}
}

export class FinancialHealthModel {
  constructor(
    public readonly currencyId: number,
    // Datos de entrada, para mostrar de dónde sale cada indicador
    public readonly liquidImmediate: number,
    public readonly monthlySavingsContributions: number,
    public readonly monthlyLoanInstallments: number,
    public readonly monthlyNetIncome: number | null,
    public readonly monthlyEssentialExpense: number | null,
    public readonly cushionMonths: HealthIndicatorModel,
    public readonly savingsRate: HealthIndicatorModel,
    public readonly debtRate: HealthIndicatorModel,
    public readonly thresholds: HealthThresholdsModel,
  ) {}
}
