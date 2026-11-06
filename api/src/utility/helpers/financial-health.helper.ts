// Indicadores de salud financiera (#228). Todo en una sola moneda (por ahora guaraníes).

export type HealthStatus = 'good' | 'warning' | 'bad';

export interface HealthThresholds {
  cushionGreenMonths: number;
  cushionYellowMonths: number;
  savingsGreenPercentage: number;
  savingsYellowPercentage: number;
  // En cuotas, más bajo es mejor
  debtGreenPercentage: number;
  debtYellowPercentage: number;
}

export interface FinancialHealthInput {
  // Líquido inmediato: cuentas + ahorros de liquidez inmediata
  liquidImmediate: number;
  // Cuotas de ahorros que vencen en el mes (pagadas o no)
  monthlySavingsContributions: number;
  // Cuotas de préstamos recibidos que vencen en el mes (pagadas o no)
  monthlyLoanInstallments: number;
  // Parámetros manuales del perfil; null si no se cargaron
  monthlyNetIncome: number | null;
  monthlyEssentialExpense: number | null;
  thresholds: HealthThresholds;
}

export interface HealthIndicatorResult {
  // null si falta el parámetro para calcularlo
  value: number | null;
  status: HealthStatus | null;
}

export interface FinancialHealthResult {
  // Meses que cubre el líquido inmediato el gasto esencial
  cushionMonths: HealthIndicatorResult;
  // % del ingreso neto que va a aportes fijos de ahorro
  savingsRate: HealthIndicatorResult;
  // % del ingreso neto que va a cuotas de préstamos
  debtRate: HealthIndicatorResult;
}

export class FinancialHealthHelper {
  static calculate(input: FinancialHealthInput): FinancialHealthResult {
    const t = input.thresholds;
    const income = FinancialHealthHelper.positiveOrNull(input.monthlyNetIncome);
    const expense = FinancialHealthHelper.positiveOrNull(input.monthlyEssentialExpense);

    // El color se decide con el valor exacto; solo el que se muestra va redondeado a un decimal
    // (2,9999 meses se ve "3,0" pero sigue en rojo con un umbral de 3)
    const cushion = expense === null ? null : Math.max(input.liquidImmediate, 0) / expense;
    const savings = income === null ? null : input.monthlySavingsContributions / income * 100;
    const debt = income === null ? null : input.monthlyLoanInstallments / income * 100;

    return {
      cushionMonths: FinancialHealthHelper.toResult(cushion, FinancialHealthHelper.higherIsBetter(cushion, t.cushionGreenMonths, t.cushionYellowMonths)),
      savingsRate: FinancialHealthHelper.toResult(savings, FinancialHealthHelper.higherIsBetter(savings, t.savingsGreenPercentage, t.savingsYellowPercentage)),
      debtRate: FinancialHealthHelper.toResult(debt, FinancialHealthHelper.lowerIsBetter(debt, t.debtGreenPercentage, t.debtYellowPercentage)),
    };
  }

  private static toResult(value: number | null, status: HealthStatus | null): HealthIndicatorResult {
    return { value: value === null ? null : FinancialHealthHelper.round(value, 1), status };
  }

  // Primer y último día del mes de `today` ('YYYY-MM-DD'), para filtrar cuotas por vencimiento
  static monthRange(today: string): { from: string; to: string } {
    const [year, month] = today.split('-').map(Number);
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const mm = String(month).padStart(2, '0');
    return { from: `${year}-${mm}-01`, to: `${year}-${mm}-${String(lastDay).padStart(2, '0')}` };
  }

  private static higherIsBetter(value: number | null, green: number, yellow: number): HealthStatus | null {
    if (value === null) return null;
    if (value >= green) return 'good';
    return value >= yellow ? 'warning' : 'bad';
  }

  private static lowerIsBetter(value: number | null, green: number, yellow: number): HealthStatus | null {
    if (value === null) return null;
    if (value <= green) return 'good';
    return value <= yellow ? 'warning' : 'bad';
  }

  private static positiveOrNull(value: number | null): number | null {
    return value !== null && Number(value) > 0 ? Number(value) : null;
  }

  private static round(value: number, decimals: number): number {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }
}
