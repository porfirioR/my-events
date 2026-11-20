import { MyMoneyIssueApiModel } from './mymoney-preview-api.model';

export interface MyMoneyKindTotalApiModel {
  count: number;
  amount: number;
}

export interface MyMoneyImportClassificationApiModel {
  consumption: MyMoneyKindTotalApiModel;
  transfer: MyMoneyKindTotalApiModel;
  income: MyMoneyKindTotalApiModel;
  refund: MyMoneyKindTotalApiModel;
  unclassified: MyMoneyKindTotalApiModel;
}

// Resultado de importar el export de MyMoney (#232)
export interface MyMoneyImportResultApiModel {
  fileName: string;
  valid: boolean;
  errors: MyMoneyIssueApiModel[];
  from: string | null;
  to: string | null;
  created: number;
  updated: number;
  deleted: number;
  unchanged: number;
  newCategories: number;
  classification: MyMoneyImportClassificationApiModel | null;
}
