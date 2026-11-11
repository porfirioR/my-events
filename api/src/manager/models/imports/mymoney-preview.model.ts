import { MyMoneyIssue, MyMoneySummary } from '../../../utility/helpers/mymoney-export.helper';

// Resultado de leer un export de MyMoney sin guardar nada (#230).
// valid = false → errors explica por qué se rechaza y summary es null.
export class MyMoneyPreviewModel {
  constructor(
    public readonly fileName: string,
    public readonly valid: boolean,
    public readonly errors: MyMoneyIssue[],
    public readonly warnings: MyMoneyIssue[],
    public readonly summary: MyMoneySummary | null,
  ) {}
}
