import { MyMoneyCategoryKind, MyMoneyMovementTypeEnum } from '../enums';
import { MyMoneyExport, MyMoneyMovement } from './mymoney-export.helper';

// Importación idempotente de movimientos de MyMoney (#232). Todo lo que decide qué guardar está acá,
// sin base de datos, para poder probarlo.

// Lo que ya está guardado de un movimiento importado
export interface ImportedMovementSnapshot {
  id: number;
  externalId: string;
  categoryExternalId: string;
  date: string;
  movementType: MyMoneyMovementTypeEnum;
  amount: number;
  note: string;
}

export interface ImportedMovementValues {
  externalId: string;
  categoryExternalId: string;
  date: string;
  movementType: MyMoneyMovementTypeEnum;
  amount: number;
  note: string;
}

export interface MyMoneyImportPlan {
  toCreate: ImportedMovementValues[];
  toUpdate: ImportedMovementValues[];
  // Ids (de my-events) de lo importado dentro del rango que ya no viene en el archivo
  toDelete: number[];
  unchanged: number;
}

// Clasificación de una categoría de MyMoney, tal como está en el mapeo (#231)
export interface CategoryClassification {
  categoryExternalId: string;
  kind: MyMoneyCategoryKind;
  needsReview: boolean;
}

export interface KindTotal {
  count: number;
  amount: number;
}

export interface MyMoneyImportClassificationSummary {
  consumption: KindTotal;
  transfer: KindTotal;
  income: KindTotal;
  refund: KindTotal;
  // Categoría nueva sin revisar (o sin mapeo): no se suma en ningún grupo hasta clasificarla
  unclassified: KindTotal;
}

// La nota se guarda con el mismo largo que la columna
export const IMPORTED_NOTE_MAX_LENGTH = 500;

const emptyTotal = (): KindTotal => ({ count: 0, amount: 0 });

export class MyMoneyImportHelper {
  static toValues(movement: MyMoneyMovement): ImportedMovementValues {
    return {
      externalId: movement.id,
      categoryExternalId: movement.categoryId,
      date: movement.date,
      movementType: movement.type === 'income' ? MyMoneyMovementTypeEnum.Income : MyMoneyMovementTypeEnum.Expense,
      amount: movement.amount,
      note: movement.memorandum.slice(0, IMPORTED_NOTE_MAX_LENGTH),
    };
  }

  // - Viene en el archivo y no estaba: se crea.
  // - Viene y estaba (por id de MyMoney, aunque se haya movido de fecha): se actualiza si cambió algo.
  // - Estaba importado con fecha dentro del rango del archivo y no viene: se borró en MyMoney.
  //   Lo que está fuera del rango no se toca, así importar un mes no borra el resto.
  static plan(existing: ImportedMovementSnapshot[], data: Pick<MyMoneyExport, 'from' | 'to' | 'movements'>): MyMoneyImportPlan {
    const byExternalId = new Map(existing.map(movement => [movement.externalId, movement]));
    const incomingIds = new Set<string>();
    const toCreate: ImportedMovementValues[] = [];
    const toUpdate: ImportedMovementValues[] = [];
    let unchanged = 0;

    data.movements.forEach(movement => {
      const values = this.toValues(movement);
      incomingIds.add(values.externalId);
      const current = byExternalId.get(values.externalId);
      if (!current) {
        toCreate.push(values);
      } else if (this.hasChanges(current, values)) {
        toUpdate.push(values);
      } else {
        unchanged++;
      }
    });

    const toDelete = existing
      .filter(movement => movement.date >= data.from && movement.date <= data.to && !incomingIds.has(movement.externalId))
      .map(movement => movement.id);

    return { toCreate, toUpdate, toDelete, unchanged };
  }

  // Totales del archivo según el mapeo de categorías: lo que el resumen muestra como consumo,
  // transferencias, ingresos, reembolsos y sin clasificar
  static classify(movements: MyMoneyMovement[], classifications: CategoryClassification[]): MyMoneyImportClassificationSummary {
    const byCategory = new Map(classifications.map(c => [c.categoryExternalId, c]));
    const summary: MyMoneyImportClassificationSummary = {
      consumption: emptyTotal(),
      transfer: emptyTotal(),
      income: emptyTotal(),
      refund: emptyTotal(),
      unclassified: emptyTotal(),
    };

    movements.forEach(movement => {
      const classification = byCategory.get(movement.categoryId);
      const total = !classification || classification.needsReview
        ? summary.unclassified
        : this.totalFor(summary, classification.kind);
      total.count++;
      total.amount += movement.amount;
    });

    return summary;
  }

  private static totalFor(summary: MyMoneyImportClassificationSummary, kind: MyMoneyCategoryKind): KindTotal {
    switch (kind) {
      case MyMoneyCategoryKind.Consumption: return summary.consumption;
      case MyMoneyCategoryKind.Transfer: return summary.transfer;
      case MyMoneyCategoryKind.Income: return summary.income;
      case MyMoneyCategoryKind.Refund: return summary.refund;
      default: return summary.unclassified;
    }
  }

  private static hasChanges(current: ImportedMovementSnapshot, values: ImportedMovementValues): boolean {
    return current.categoryExternalId !== values.categoryExternalId
      || current.date !== values.date
      || current.movementType !== values.movementType
      || current.amount !== values.amount
      || current.note !== values.note;
  }
}
