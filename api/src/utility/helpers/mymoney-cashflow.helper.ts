import { MyMoneyCategoryKind, MyMoneyMovementTypeEnum } from '../enums';
import { MyMoneyCategoryMappingHelper } from './mymoney-category-mapping.helper';

// Ingresos, consumo y aportes a ahorros por mes a partir de los movimientos importados de MyMoney (#234).
// Reemplaza los parámetros manuales de los indicadores de salud (#228) cuando hay datos de todos los meses.

export interface CashflowMovement {
  // 'YYYY-MM-DD'
  date: string;
  movementType: number;
  amount: number;
  categoryExternalId: string;
  note: string;
}

export interface CashflowCategory {
  categoryExternalId: string;
  kind: number;
  isEssential: boolean;
  isExtraordinary: boolean;
  // Destino de la categoría (si es una transferencia a un ahorro)
  savingsGoalId: number | null;
}

// Patrón de descripción: solo importa si apunta a un ahorro (gana el patrón más largo, como en #233)
export interface CashflowRule {
  pattern: string;
  savingsGoalId: number | null;
}

export interface CashflowMonth {
  // 'YYYY-MM'
  month: string;
  // Ingresos habituales (sin extraordinarios como el aguinaldo)
  income: number;
  extraordinaryIncome: number;
  consumption: number;
  refunds: number;
  // Consumo menos reintegros
  netConsumption: number;
  // Consumo de las categorías marcadas como esenciales
  essentialExpense: number;
  // Lo transferido a ahorros (aportes con o sin cuotas: Ña, rueda, Ahorro Casa, fondo mutuo…)
  savingsContributions: number;
  // Aportes que solo movieron plata que entró como transferencia (préstamo o cobro de otro ahorro):
  // no son ahorro nuevo y no suman a savingsContributions (ej. CDA comprado con un préstamo)
  movedSavings: number;
  movementCount: number;
}

export interface CashflowSummary {
  months: CashflowMonth[];
  // Todos los meses tienen movimientos importados: si falta alguno, se usan los parámetros manuales
  complete: boolean;
  // Promedios mensuales de los meses
  monthlyNetIncome: number;
  monthlyEssentialExpense: number;
  monthlyNetConsumption: number;
  monthlySavingsContributions: number;
}

// Un aporte con el mismo monto que una transferencia que entró hasta tantos días antes o después
// se toma como la misma plata cambiando de lugar
const MOVED_MONEY_MAX_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export class MyMoneyCashflowHelper {
  // Los últimos `count` meses completos antes del mes de today ('YYYY-MM-DD'), del más viejo al más nuevo:
  // el mes en curso no entra porque todavía no terminó
  static lastCompleteMonths(today: string, count: number): string[] {
    const [year, month] = today.split('-').map(Number);
    return Array.from({ length: count }, (_, index) => {
      const date = new Date(Date.UTC(year, month - 1 - count + index, 1));
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    });
  }

  // Primer y último día de una lista de meses 'YYYY-MM' ordenada; con marginDays el rango se agranda para
  // ver las transferencias de los días vecinos (un préstamo del 28/4 puede ir a un ahorro el 2/5)
  static range(months: string[], marginDays = 0): { from: string; to: string } {
    const [lastYear, lastMonth] = months[months.length - 1].split('-').map(Number);
    const lastDay = new Date(Date.UTC(lastYear, lastMonth, 0)).getUTCDate();
    const from = new Date(`${months[0]}-01T00:00:00Z`).getTime() - marginDays * DAY_MS;
    const to = Date.UTC(lastYear, lastMonth - 1, lastDay) + marginDays * DAY_MS;
    return { from: new Date(from).toISOString().substring(0, 10), to: new Date(to).toISOString().substring(0, 10) };
  }

  // - Ingreso: categorías de tipo Income que no son extraordinarias
  // - Consumo: categorías de tipo Consumption; los reintegros (Refund) se descuentan del consumo
  // - Aporte a ahorros: gastos de tipo Transfer que van a un ahorro (por patrón de descripción o por la
  //   categoría). Los retiros de ahorros no se restan: el % de ahorro mide lo que se aporta cada mes.
  //   Si el aporte tiene el mismo monto que una transferencia que entró en la misma semana (desembolso de
  //   un préstamo, cobro de otro ahorro), es la misma plata cambiando de lugar y no cuenta como ahorro
  //   (cada transferencia que entra cubre un solo aporte)
  // - Lo demás (cuotas y préstamos, ingresos de transferencias) no cuenta en ningún lado
  // - Una categoría sin mapeo usa el default de su tipo: consumo si es gasto, ingreso si es ingreso
  static summarize(
    movements: CashflowMovement[],
    categories: CashflowCategory[],
    rules: CashflowRule[],
    months: string[],
  ): CashflowSummary {
    const categoryById = new Map(categories.map(category => [category.categoryExternalId, category]));
    const byMonth = new Map(months.map(month => [month, MyMoneyCashflowHelper.emptyMonth(month)]));
    const kindOf = (movement: CashflowMovement): number => categoryById.get(movement.categoryExternalId)?.kind
      ?? (movement.movementType === MyMoneyMovementTypeEnum.Expense ? MyMoneyCategoryKind.Consumption : MyMoneyCategoryKind.Income);
    const sorted = [...movements].sort((a, b) => a.date.localeCompare(b.date));
    // Transferencias que entran (también de los días vecinos a los meses), para detectar la plata que se mueve
    const incomingTransfers = sorted
      .filter(m => m.movementType === MyMoneyMovementTypeEnum.Income && kindOf(m) === MyMoneyCategoryKind.Transfer)
      .map(m => ({ time: new Date(m.date).getTime(), amount: Number(m.amount), used: false }));

    sorted.forEach(movement => {
      const summary = byMonth.get(movement.date.substring(0, 7));
      if (!summary) return;
      const amount = Number(movement.amount);
      const isExpense = movement.movementType === MyMoneyMovementTypeEnum.Expense;
      const category = categoryById.get(movement.categoryExternalId);
      const kind = kindOf(movement);
      summary.movementCount++;

      if (isExpense && kind === MyMoneyCategoryKind.Consumption) {
        summary.consumption += amount;
        if (category?.isEssential) summary.essentialExpense += amount;
      } else if (isExpense && kind === MyMoneyCategoryKind.Transfer) {
        const rule = MyMoneyCategoryMappingHelper.findDescriptionRule(rules, movement.note);
        const savingsGoalId = rule ? rule.savingsGoalId : category?.savingsGoalId ?? null;
        if (savingsGoalId === null) return;
        const time = new Date(movement.date).getTime();
        const source = incomingTransfers.find(transfer => !transfer.used && transfer.amount === amount
          && Math.abs(transfer.time - time) <= MOVED_MONEY_MAX_DAYS * DAY_MS);
        if (source) {
          source.used = true;
          summary.movedSavings += amount;
        } else {
          summary.savingsContributions += amount;
        }
      } else if (!isExpense && kind === MyMoneyCategoryKind.Income) {
        if (category?.isExtraordinary) summary.extraordinaryIncome += amount;
        else summary.income += amount;
      } else if (!isExpense && kind === MyMoneyCategoryKind.Refund) {
        summary.refunds += amount;
      }
    });

    const result = months.map(month => {
      const summary = byMonth.get(month)!;
      return { ...summary, netConsumption: summary.consumption - summary.refunds };
    });
    const average = (pick: (month: CashflowMonth) => number) =>
      result.length === 0 ? 0 : Math.round(result.reduce((sum, month) => sum + pick(month), 0) / result.length);

    return {
      months: result,
      complete: result.length > 0 && result.every(month => month.movementCount > 0),
      monthlyNetIncome: average(month => month.income),
      monthlyEssentialExpense: average(month => month.essentialExpense),
      monthlyNetConsumption: average(month => month.netConsumption),
      monthlySavingsContributions: average(month => month.savingsContributions),
    };
  }

  private static emptyMonth(month: string): CashflowMonth {
    return {
      month,
      income: 0,
      extraordinaryIncome: 0,
      consumption: 0,
      refunds: 0,
      netConsumption: 0,
      essentialExpense: 0,
      savingsContributions: 0,
      movedSavings: 0,
      movementCount: 0,
    };
  }
}
