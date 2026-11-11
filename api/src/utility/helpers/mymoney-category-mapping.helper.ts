import { MyMoneyCategoryKind, MyMoneyMovementTypeEnum } from '../enums';
import { MyMoneyCategory, MyMoneyMovementType } from './mymoney-export.helper';

// Clasificación de las categorías de MyMoney (#231). Las reglas por defecto usan el nombre con el que
// MyMoney guarda la categoría (clave en inglés para las predeterminadas, el texto del usuario para las propias).

export interface MyMoneyClassification {
  kind: MyMoneyCategoryKind;
  isEssential: boolean;
  isExtraordinary: boolean;
}

// Lo que ya está guardado de una categoría, para comparar contra el export
export interface MyMoneyExistingMapping {
  id: number;
  categoryExternalId: string;
  categoryName: string;
}

export interface MyMoneyNewMapping extends MyMoneyClassification {
  categoryExternalId: string;
  categoryName: string;
  movementType: MyMoneyMovementTypeEnum;
  needsReview: boolean;
}

export interface MyMoneyRename {
  id: number;
  categoryName: string;
}

export interface MyMoneySyncPlan {
  toCreate: MyMoneyNewMapping[];
  toRename: MyMoneyRename[];
}

// Gastos que en realidad mueven plata a un ahorro, una inversión o un préstamo
const EXPENSE_TRANSFERS = ['saving', 'ahorro casa', 'loans', 'investments'];
// Ingresos que vuelven de un ahorro o de un préstamo (cobrado o recibido)
const INCOME_TRANSFERS = ['ahorros', 'loans'];
const INCOME_REFUNDS = ['refunds'];
const INCOME_EXTRAORDINARY = ['awards'];
const ESSENTIAL_EXPENSES = ['health', 'car', 'gas', 'house', 'food', 'super', 'dentist', 'tax', 'pets', 'telephone'];

const EXPENSE_KINDS = [MyMoneyCategoryKind.Consumption, MyMoneyCategoryKind.Transfer];
const INCOME_KINDS = [MyMoneyCategoryKind.Income, MyMoneyCategoryKind.Transfer, MyMoneyCategoryKind.Refund];

export class MyMoneyCategoryMappingHelper {
  static toMovementType(type: MyMoneyMovementType): MyMoneyMovementTypeEnum {
    return type === 'income' ? MyMoneyMovementTypeEnum.Income : MyMoneyMovementTypeEnum.Expense;
  }

  static allowedKinds(movementType: MyMoneyMovementTypeEnum): MyMoneyCategoryKind[] {
    return movementType === MyMoneyMovementTypeEnum.Income ? INCOME_KINDS : EXPENSE_KINDS;
  }

  static isKindAllowed(movementType: MyMoneyMovementTypeEnum, kind: MyMoneyCategoryKind): boolean {
    return this.allowedKinds(movementType).includes(kind);
  }

  // Default según el issue: gastos de ahorro/préstamo/inversión → Transfer, resto → Consumption;
  // ingresos de ahorro/préstamo → Transfer, Refunds → Refund, Awards → Income extraordinario, resto → Income.
  static defaultClassification(name: string, movementType: MyMoneyMovementTypeEnum): MyMoneyClassification {
    const key = name.trim().toLowerCase();
    if (movementType === MyMoneyMovementTypeEnum.Expense) {
      if (EXPENSE_TRANSFERS.includes(key)) {
        return { kind: MyMoneyCategoryKind.Transfer, isEssential: false, isExtraordinary: false };
      }
      return { kind: MyMoneyCategoryKind.Consumption, isEssential: ESSENTIAL_EXPENSES.includes(key), isExtraordinary: false };
    }

    if (INCOME_TRANSFERS.includes(key)) {
      return { kind: MyMoneyCategoryKind.Transfer, isEssential: false, isExtraordinary: false };
    }
    if (INCOME_REFUNDS.includes(key)) {
      return { kind: MyMoneyCategoryKind.Refund, isEssential: false, isExtraordinary: false };
    }
    return { kind: MyMoneyCategoryKind.Income, isEssential: false, isExtraordinary: INCOME_EXTRAORDINARY.includes(key) };
  }

  // Esencial solo tiene sentido en consumo y extraordinario solo en ingreso: se apagan en el resto
  static normalize(kind: MyMoneyCategoryKind, isEssential: boolean, isExtraordinary: boolean): MyMoneyClassification {
    return {
      kind,
      isEssential: kind === MyMoneyCategoryKind.Consumption && isEssential,
      isExtraordinary: kind === MyMoneyCategoryKind.Income && isExtraordinary,
    };
  }

  // Compara las categorías del export con las ya guardadas (por id de MyMoney).
  // - Nueva: se clasifica con el default. En la primera sincronización (sin nada guardado) no se marca
  //   "a revisar" porque los defaults son la clasificación inicial; después, toda categoría nueva sí.
  // - Renombrada en MyMoney: se actualiza el nombre y se conserva la clasificación.
  // - Las que ya no vienen en el export no se tocan (pueden volver a aparecer en otro rango).
  static planSync(existing: MyMoneyExistingMapping[], categories: MyMoneyCategory[]): MyMoneySyncPlan {
    const byExternalId = new Map(existing.map(mapping => [mapping.categoryExternalId, mapping]));
    const isFirstSync = existing.length === 0;
    const toCreate: MyMoneyNewMapping[] = [];
    const toRename: MyMoneyRename[] = [];

    categories.forEach(category => {
      const name = category.name.trim();
      const current = byExternalId.get(category.id);
      if (current) {
        if (current.categoryName !== name) toRename.push({ id: current.id, categoryName: name });
        return;
      }

      const movementType = this.toMovementType(category.type);
      toCreate.push({
        categoryExternalId: category.id,
        categoryName: name,
        movementType,
        ...this.defaultClassification(name, movementType),
        needsReview: !isFirstSync,
      });
    });

    return { toCreate, toRename };
  }

  // El memorándum empieza con el patrón como palabra completa, sin distinguir mayúsculas ni espacios
  // de más: "Ña 12" toma "Ña 12 13/15" pero no "Ña 1 3/12"; "Rueda" toma "Rueda cu 37/60".
  static matchesDescription(pattern: string, memorandum: string): boolean {
    const normalizedPattern = this.normalizeText(pattern);
    const normalizedMemo = this.normalizeText(memorandum);
    if (!normalizedPattern || !normalizedMemo.startsWith(normalizedPattern)) return false;

    const next = normalizedMemo.charAt(normalizedPattern.length);
    return next === '' || !/[\p{L}\p{N}]/u.test(next);
  }

  private static normalizeText(text: string): string {
    return text.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es');
  }
}
