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
    // Resumen mensual por email (#263): activado por defecto, en el idioma de la app ('es' | 'en')
    public readonly monthlySummaryEmail: boolean,
    public readonly language: string,
  ) {}
}

export class HealthIndicatorModel {
  constructor(
    // null si falta el parámetro para calcularlo
    public readonly value: number | null,
    public readonly status: HealthStatus | null,
  ) {}
}

// De dónde salen el ingreso neto, el gasto esencial y los aportes a ahorros:
// 'imported' = promedio de los movimientos de MyMoney (#234); 'manual' = parámetros del perfil y cuotas del mes
export type HealthDataSource = 'imported' | 'manual';

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
    public readonly source: HealthDataSource,
    // Meses promediados ('YYYY-MM'); los que no tienen datos importados explican por qué se usa 'manual'
    public readonly importedMonths: string[],
    public readonly missingImportedMonths: string[],
    // Consumo neto promedio (consumo − reintegros), solo informativo; null si no hay datos importados
    public readonly monthlyNetConsumption: number | null,
  ) {}
}
