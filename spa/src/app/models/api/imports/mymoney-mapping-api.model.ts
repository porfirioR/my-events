import { MyMoneyIssueApiModel } from './mymoney-preview-api.model';

// Mapeo de categorías y descripciones de MyMoney (#231)

export enum MyMoneyMappingMovementType {
  Expense = 1,
  Income = 2,
}

// Transfer = plata que solo cambia de lugar (ahorro, préstamo): no es consumo ni ingreso
export enum MyMoneyCategoryKind {
  Consumption = 1,
  Transfer = 2,
  Income = 3,
  Refund = 4,
}

export const MyMoneyKindsByMovementType: Record<MyMoneyMappingMovementType, MyMoneyCategoryKind[]> = {
  [MyMoneyMappingMovementType.Expense]: [MyMoneyCategoryKind.Consumption, MyMoneyCategoryKind.Transfer],
  [MyMoneyMappingMovementType.Income]: [MyMoneyCategoryKind.Income, MyMoneyCategoryKind.Transfer, MyMoneyCategoryKind.Refund],
};

export const MyMoneyCategoryKindLabels: Record<MyMoneyCategoryKind, string> = {
  [MyMoneyCategoryKind.Consumption]: 'myMoneyMapping.kinds.consumption',
  [MyMoneyCategoryKind.Transfer]: 'myMoneyMapping.kinds.transfer',
  [MyMoneyCategoryKind.Income]: 'myMoneyMapping.kinds.income',
  [MyMoneyCategoryKind.Refund]: 'myMoneyMapping.kinds.refund',
};

// Cuenta, ahorro o préstamo vinculado (a lo sumo uno)
export interface MyMoneyLinkTargetApiModel {
  accountId: number | null;
  savingsGoalId: number | null;
  loanId: number | null;
}

export interface MyMoneyCategoryMappingApiModel extends MyMoneyLinkTargetApiModel {
  id: number;
  categoryExternalId: string;
  categoryName: string;
  movementType: MyMoneyMappingMovementType;
  kind: MyMoneyCategoryKind;
  isEssential: boolean;
  isExtraordinary: boolean;
  needsReview: boolean;
}

export interface MyMoneyCategorySyncApiModel {
  fileName: string;
  valid: boolean;
  errors: MyMoneyIssueApiModel[];
  created: number;
  renamed: number;
  mappings: MyMoneyCategoryMappingApiModel[];
}

export interface UpdateMyMoneyCategoryMappingApiRequest extends MyMoneyLinkTargetApiModel {
  kind: MyMoneyCategoryKind;
  isEssential: boolean;
  isExtraordinary: boolean;
}

export interface MyMoneyDescriptionRuleApiModel extends MyMoneyLinkTargetApiModel {
  id: number;
  pattern: string;
}

export interface UpsertMyMoneyDescriptionRuleApiRequest extends MyMoneyLinkTargetApiModel {
  pattern: string;
}
