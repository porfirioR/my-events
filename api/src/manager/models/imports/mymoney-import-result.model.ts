import { MyMoneyIssue } from '../../../utility/helpers/mymoney-export.helper';
import { MyMoneyImportClassificationSummary } from '../../../utility/helpers/mymoney-import.helper';

// Resultado de importar un export de MyMoney (#232).
// valid = false → no se guardó nada y errors explica por qué; el resto queda en cero/null.
export class MyMoneyImportResultModel {
  constructor(
    public readonly fileName: string,
    public readonly valid: boolean,
    public readonly errors: MyMoneyIssue[],
    public readonly from: string | null,
    public readonly to: string | null,
    public readonly created: number,
    public readonly updated: number,
    public readonly deleted: number,
    public readonly unchanged: number,
    // Categorías nuevas agregadas al mapeo por este archivo (quedan "a revisar")
    public readonly newCategories: number,
    public readonly classification: MyMoneyImportClassificationSummary | null,
  ) {}
}
