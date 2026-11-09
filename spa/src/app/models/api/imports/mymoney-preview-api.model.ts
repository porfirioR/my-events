// Respuesta de POST imports/mymoney/preview (#230): lectura del export de MyMoney sin guardar nada

export type MyMoneyMovementType = 'income' | 'expense';

// code se traduce con myMoneyImport.issues.<code>; path dice dónde está el problema en el archivo
export interface MyMoneyIssueApiModel {
  code: string;
  path: string;
  params?: Record<string, string | number>;
}

export interface MyMoneyTotalsApiModel {
  movementCount: number;
  incomeCount: number;
  expenseCount: number;
  income: number;
  expense: number;
  net: number;
}

export interface MyMoneyMonthSummaryApiModel extends MyMoneyTotalsApiModel {
  // 'YYYY-MM'
  month: string;
}

export interface MyMoneyCategorySummaryApiModel {
  id: string;
  name: string;
  type: MyMoneyMovementType;
  active: boolean;
  movementCount: number;
  total: number;
}

export interface MyMoneySummaryApiModel {
  exportedAt: string;
  timezone: string;
  currency: string;
  from: string;
  to: string;
  totals: MyMoneyTotalsApiModel;
  months: MyMoneyMonthSummaryApiModel[];
  categories: MyMoneyCategorySummaryApiModel[];
  relatedGroupCount: number;
}

export interface MyMoneyPreviewApiModel {
  fileName: string;
  valid: boolean;
  errors: MyMoneyIssueApiModel[];
  warnings: MyMoneyIssueApiModel[];
  summary: MyMoneySummaryApiModel | null;
}
