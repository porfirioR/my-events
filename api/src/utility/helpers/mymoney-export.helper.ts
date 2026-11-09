// Lectura del export de MyMoney (#230, epic #213). Contrato definido en MyMoney (src/app/models/my-events-export.model.ts):
// si MyMoney cambia el formato de forma incompatible sube la versión, y acá hay que soportarla explícitamente.
export const MYMONEY_EXPORT_FORMAT = 'mymoney-export';
export const MYMONEY_EXPORT_VERSION = 1;
export const MYMONEY_EXPORT_CURRENCY = 'PYG';
// Más errores que estos no ayudan: con un archivo mal armado se cortaría la lista
export const MYMONEY_MAX_ISSUES = 50;

export type MyMoneyMovementType = 'income' | 'expense';

export interface MyMoneyCategory {
  id: string;
  name: string;
  type: MyMoneyMovementType;
  active: boolean;
}

export interface MyMoneyMovement {
  // Id de Firestore: permite re-importar sin duplicar (#232)
  id: string;
  // Fecha local (YYYY-MM-DD) en la zona horaria del export
  date: string;
  type: MyMoneyMovementType;
  categoryId: string;
  // Siempre positivo; el tipo dice si entra o sale
  amount: number;
  memorandum: string;
}

export interface MyMoneyRelatedGroup {
  id: string;
  name: string;
  progressType: string;
  totalAmount: number;
  movementIds: string[];
}

export interface MyMoneyExport {
  exportedAt: string;
  timezone: string;
  currency: string;
  // Rango completo: un movimiento del rango que no está en el archivo se borró en MyMoney
  from: string;
  to: string;
  categories: MyMoneyCategory[];
  movements: MyMoneyMovement[];
  relatedGroups: MyMoneyRelatedGroup[];
}

// code se traduce en el SPA (myMoneyImport.issues.<code>); path dice dónde está el problema
export interface MyMoneyIssue {
  code: string;
  path: string;
  params?: Record<string, string | number>;
}

export type MyMoneyParseResult =
  | { valid: true; data: MyMoneyExport; errors: []; warnings: MyMoneyIssue[] }
  | { valid: false; data: null; errors: MyMoneyIssue[]; warnings: MyMoneyIssue[] };

export interface MyMoneyTotals {
  movementCount: number;
  incomeCount: number;
  expenseCount: number;
  income: number;
  expense: number;
  // income - expense
  net: number;
}

export interface MyMoneyMonthSummary extends MyMoneyTotals {
  // 'YYYY-MM'
  month: string;
}

export interface MyMoneyCategorySummary {
  id: string;
  name: string;
  type: MyMoneyMovementType;
  active: boolean;
  movementCount: number;
  total: number;
}

export interface MyMoneySummary {
  exportedAt: string;
  timezone: string;
  currency: string;
  from: string;
  to: string;
  totals: MyMoneyTotals;
  // Todos los meses del rango, también los que no tienen movimientos
  months: MyMoneyMonthSummary[];
  categories: MyMoneyCategorySummary[];
  relatedGroupCount: number;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MOVEMENT_TYPES: MyMoneyMovementType[] = ['income', 'expense'];

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value);
const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '';
const describe = (value: unknown): string => {
  if (value === undefined) return 'undefined';
  const text = JSON.stringify(value) ?? String(value);
  return text.length > 40 ? `${text.slice(0, 40)}…` : text;
};

// Junta errores sin pasarse del máximo; cuenta los que quedaron afuera
class IssueCollector {
  readonly issues: MyMoneyIssue[] = [];
  private dropped = 0;

  add(code: string, path: string, params?: Record<string, string | number>): void {
    if (this.issues.length < MYMONEY_MAX_ISSUES) {
      this.issues.push(params ? { code, path, params } : { code, path });
    } else {
      this.dropped++;
    }
  }

  get count(): number { return this.issues.length + this.dropped; }

  result(): MyMoneyIssue[] {
    return this.dropped > 0
      ? [...this.issues, { code: 'tooManyIssues', path: '', params: { count: this.dropped } }]
      : this.issues;
  }
}

export class MyMoneyExportHelper {
  // Recibe el texto del archivo; nunca lanza excepciones: todo problema vuelve como error
  static parseText(text: string): MyMoneyParseResult {
    let raw: unknown;
    try {
      // Algunos editores agregan BOM al guardar
      raw = JSON.parse(text.replace(/^﻿/, ''));
    } catch {
      return MyMoneyExportHelper.invalid([{ code: 'invalidJson', path: '' }], []);
    }
    return MyMoneyExportHelper.parse(raw);
  }

  static parse(raw: unknown): MyMoneyParseResult {
    if (!isObject(raw)) {
      return MyMoneyExportHelper.invalid([{ code: 'notAnObject', path: '' }], []);
    }

    // Formato y versión primero: si es otro archivo no tiene sentido validar el resto
    if (raw.format !== MYMONEY_EXPORT_FORMAT) {
      return MyMoneyExportHelper.invalid([{ code: 'invalidFormat', path: 'format', params: { value: describe(raw.format), expected: MYMONEY_EXPORT_FORMAT } }], []);
    }
    if (raw.version !== MYMONEY_EXPORT_VERSION) {
      return MyMoneyExportHelper.invalid([{ code: 'unsupportedVersion', path: 'version', params: { value: describe(raw.version), expected: MYMONEY_EXPORT_VERSION } }], []);
    }

    const errors = new IssueCollector();
    const warnings = new IssueCollector();

    if (raw.currency !== MYMONEY_EXPORT_CURRENCY) {
      errors.add('invalidCurrency', 'currency', { value: describe(raw.currency), expected: MYMONEY_EXPORT_CURRENCY });
    }
    if (!isNonEmptyString(raw.exportedAt)) errors.add('required', 'exportedAt');
    if (!isNonEmptyString(raw.timezone)) errors.add('required', 'timezone');

    const fromValid = MyMoneyExportHelper.checkDate(raw.from, 'from', errors);
    const toValid = MyMoneyExportHelper.checkDate(raw.to, 'to', errors);
    const rangeValid = fromValid && toValid && (raw.from as string) <= (raw.to as string);
    if (fromValid && toValid && !rangeValid) {
      errors.add('invalidRange', 'from', { from: raw.from as string, to: raw.to as string });
    }

    const categories = MyMoneyExportHelper.parseCategories(raw.categories, errors);
    const categoryById = new Map(categories.map(c => [c.id, c]));
    const movements = MyMoneyExportHelper.parseMovements(raw.movements, errors, warnings, categoryById, rangeValid ? { from: raw.from as string, to: raw.to as string } : null);
    const relatedGroups = MyMoneyExportHelper.parseRelatedGroups(raw.relatedGroups, errors, new Set(movements.map(m => m.id)));

    if (errors.count > 0) {
      return MyMoneyExportHelper.invalid(errors.result(), warnings.result());
    }

    return {
      valid: true,
      data: {
        exportedAt: raw.exportedAt as string,
        timezone: raw.timezone as string,
        currency: raw.currency as string,
        from: raw.from as string,
        to: raw.to as string,
        categories,
        movements,
        relatedGroups,
      },
      errors: [],
      warnings: warnings.result(),
    };
  }

  // Totales por mes y por categoría: lo que se compara con los reportes anuales de MyMoney
  static summarize(data: MyMoneyExport): MyMoneySummary {
    const months = new Map<string, MyMoneyMonthSummary>();
    MyMoneyExportHelper.monthsBetween(data.from, data.to).forEach(month => months.set(month, { month, ...MyMoneyExportHelper.emptyTotals() }));

    const totals = MyMoneyExportHelper.emptyTotals();
    const byCategory = new Map<string, MyMoneyCategorySummary>(
      data.categories.map(c => [c.id, { id: c.id, name: c.name, type: c.type, active: c.active, movementCount: 0, total: 0 }]),
    );

    data.movements.forEach(m => {
      MyMoneyExportHelper.addTo(totals, m);
      // El parser ya garantiza que la fecha está dentro del rango
      MyMoneyExportHelper.addTo(months.get(m.date.slice(0, 7))!, m);
      const category = byCategory.get(m.categoryId)!;
      category.movementCount++;
      category.total += m.amount;
    });

    return {
      exportedAt: data.exportedAt,
      timezone: data.timezone,
      currency: data.currency,
      from: data.from,
      to: data.to,
      totals,
      months: [...months.values()],
      // Primero las que tienen movimientos, de mayor a menor
      categories: [...byCategory.values()].sort((a, b) =>
        a.type.localeCompare(b.type) || b.total - a.total || a.name.localeCompare(b.name)),
      relatedGroupCount: data.relatedGroups.length,
    };
  }

  // 'YYYY-MM' de cada mes entre dos fechas, ambos inclusive
  static monthsBetween(from: string, to: string): string[] {
    const result: string[] = [];
    let year = +from.slice(0, 4);
    let month = +from.slice(5, 7);
    const last = to.slice(0, 7);
    for (;;) {
      const key = `${year}-${String(month).padStart(2, '0')}`;
      if (key > last) break;
      result.push(key);
      month++;
      if (month > 12) { month = 1; year++; }
    }
    return result;
  }

  static isValidDate(value: unknown): value is string {
    if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    // Rechaza fechas que no existen (2026-02-30)
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }

  private static parseCategories(value: unknown, errors: IssueCollector): MyMoneyCategory[] {
    if (!Array.isArray(value)) {
      errors.add('required', 'categories');
      return [];
    }
    const seen = new Set<string>();
    const result: MyMoneyCategory[] = [];
    value.forEach((item, index) => {
      const path = `categories[${index}]`;
      if (!isObject(item)) { errors.add('notAnObject', path); return; }
      let ok = true;
      if (!isNonEmptyString(item.id)) { errors.add('required', `${path}.id`); ok = false; }
      else if (seen.has(item.id)) { errors.add('duplicateId', `${path}.id`, { value: item.id }); ok = false; }
      if (!isNonEmptyString(item.name)) { errors.add('required', `${path}.name`); ok = false; }
      if (!MOVEMENT_TYPES.includes(item.type as MyMoneyMovementType)) { errors.add('invalidType', `${path}.type`, { value: describe(item.type) }); ok = false; }
      if (item.active !== undefined && typeof item.active !== 'boolean') { errors.add('invalidBoolean', `${path}.active`, { value: describe(item.active) }); ok = false; }
      if (isNonEmptyString(item.id)) seen.add(item.id);
      if (!ok) return;
      result.push({ id: item.id as string, name: (item.name as string).trim(), type: item.type as MyMoneyMovementType, active: item.active !== false });
    });
    return result;
  }

  private static parseMovements(
    value: unknown,
    errors: IssueCollector,
    warnings: IssueCollector,
    categoryById: Map<string, MyMoneyCategory>,
    range: { from: string; to: string } | null,
  ): MyMoneyMovement[] {
    if (!Array.isArray(value)) {
      errors.add('required', 'movements');
      return [];
    }
    const seen = new Set<string>();
    const result: MyMoneyMovement[] = [];
    value.forEach((item, index) => {
      const path = `movements[${index}]`;
      if (!isObject(item)) { errors.add('notAnObject', path); return; }
      let ok = true;
      if (!isNonEmptyString(item.id)) { errors.add('required', `${path}.id`); ok = false; }
      else if (seen.has(item.id)) { errors.add('duplicateId', `${path}.id`, { value: item.id }); ok = false; }
      if (isNonEmptyString(item.id)) seen.add(item.id);

      if (!MyMoneyExportHelper.checkDate(item.date, `${path}.date`, errors)) ok = false;
      else if (range && ((item.date as string) < range.from || (item.date as string) > range.to)) {
        errors.add('dateOutOfRange', `${path}.date`, { value: item.date as string, from: range.from, to: range.to });
        ok = false;
      }

      if (!MOVEMENT_TYPES.includes(item.type as MyMoneyMovementType)) { errors.add('invalidType', `${path}.type`, { value: describe(item.type) }); ok = false; }

      // Guaraníes: enteros mayores a cero
      if (typeof item.amount !== 'number' || !Number.isInteger(item.amount) || item.amount <= 0) {
        errors.add('invalidAmount', `${path}.amount`, { value: describe(item.amount) });
        ok = false;
      }

      if (item.memorandum !== undefined && typeof item.memorandum !== 'string') {
        errors.add('invalidText', `${path}.memorandum`, { value: describe(item.memorandum) });
        ok = false;
      }

      const category = isNonEmptyString(item.categoryId) ? categoryById.get(item.categoryId) : undefined;
      if (!isNonEmptyString(item.categoryId)) { errors.add('required', `${path}.categoryId`); ok = false; }
      else if (!category) { errors.add('unknownCategory', `${path}.categoryId`, { value: item.categoryId }); ok = false; }
      else if (MOVEMENT_TYPES.includes(item.type as MyMoneyMovementType) && category.type !== item.type) {
        // No bloquea: se cuenta según el tipo del movimiento, como en MyMoney
        warnings.add('categoryTypeMismatch', `${path}.categoryId`, { value: category.name, type: item.type as string, categoryType: category.type });
      }

      if (!ok) return;
      result.push({
        id: item.id as string,
        date: item.date as string,
        type: item.type as MyMoneyMovementType,
        categoryId: item.categoryId as string,
        amount: item.amount as number,
        memorandum: ((item.memorandum as string | undefined) ?? '').trim(),
      });
    });
    return result;
  }

  private static parseRelatedGroups(value: unknown, errors: IssueCollector, movementIds: Set<string>): MyMoneyRelatedGroup[] {
    if (!Array.isArray(value)) {
      errors.add('required', 'relatedGroups');
      return [];
    }
    const seen = new Set<string>();
    const result: MyMoneyRelatedGroup[] = [];
    value.forEach((item, index) => {
      const path = `relatedGroups[${index}]`;
      if (!isObject(item)) { errors.add('notAnObject', path); return; }
      let ok = true;
      if (!isNonEmptyString(item.id)) { errors.add('required', `${path}.id`); ok = false; }
      else if (seen.has(item.id)) { errors.add('duplicateId', `${path}.id`, { value: item.id }); ok = false; }
      if (isNonEmptyString(item.id)) seen.add(item.id);
      if (!isNonEmptyString(item.name)) { errors.add('required', `${path}.name`); ok = false; }
      if (typeof item.progressType !== 'string') { errors.add('invalidText', `${path}.progressType`, { value: describe(item.progressType) }); ok = false; }
      if (typeof item.totalAmount !== 'number' || !Number.isFinite(item.totalAmount) || item.totalAmount < 0) {
        errors.add('invalidTotal', `${path}.totalAmount`, { value: describe(item.totalAmount) });
        ok = false;
      }
      if (!Array.isArray(item.movementIds)) { errors.add('required', `${path}.movementIds`); return; }
      item.movementIds.forEach((id, idIndex) => {
        if (typeof id !== 'string' || !movementIds.has(id)) {
          errors.add('unknownMovement', `${path}.movementIds[${idIndex}]`, { value: describe(id) });
          ok = false;
        }
      });
      if (!ok) return;
      result.push({
        id: item.id as string,
        name: (item.name as string).trim(),
        progressType: item.progressType as string,
        totalAmount: item.totalAmount as number,
        movementIds: item.movementIds as string[],
      });
    });
    return result;
  }

  private static checkDate(value: unknown, path: string, errors: IssueCollector): boolean {
    if (value === undefined || value === null || value === '') { errors.add('required', path); return false; }
    if (!MyMoneyExportHelper.isValidDate(value)) { errors.add('invalidDate', path, { value: describe(value) }); return false; }
    return true;
  }

  private static emptyTotals = (): MyMoneyTotals => ({ movementCount: 0, incomeCount: 0, expenseCount: 0, income: 0, expense: 0, net: 0 });

  private static addTo(totals: MyMoneyTotals, movement: MyMoneyMovement): void {
    totals.movementCount++;
    if (movement.type === 'income') {
      totals.incomeCount++;
      totals.income += movement.amount;
      totals.net += movement.amount;
    } else {
      totals.expenseCount++;
      totals.expense += movement.amount;
      totals.net -= movement.amount;
    }
  }

  private static invalid(errors: MyMoneyIssue[], warnings: MyMoneyIssue[]): MyMoneyParseResult {
    return { valid: false, data: null, errors, warnings };
  }
}
