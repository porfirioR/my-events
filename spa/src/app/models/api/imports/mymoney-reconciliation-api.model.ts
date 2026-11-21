// Conciliación de transferencias con cuotas (#233)

export type MyMoneyReconciliationStatus = 'reconciled' | 'matched' | 'paidOnlyInMyMoney' | 'unmatched' | 'noInstallments';
export type MyMoneyReconciliationTargetKind = 'savings' | 'loan';

export interface MyMoneyReconciliationInstallmentApiModel {
  id: number;
  targetKind: MyMoneyReconciliationTargetKind;
  targetId: number;
  targetName: string;
  number: number;
  amount: number;
  dueDate: string | null;
  // 1 Pending, 2 Paid, 3 Skipped
  statusId: number;
  paidDate: string | null;
}

export interface MyMoneyReconciliationRowApiModel {
  importedMovementId: number;
  date: string;
  amount: number;
  note: string;
  targetKind: MyMoneyReconciliationTargetKind;
  targetId: number;
  targetName: string;
  status: MyMoneyReconciliationStatus;
  noteNumber: number | null;
  amountDiffers: boolean;
  dateDiffers: boolean;
  installments: MyMoneyReconciliationInstallmentApiModel[];
}

export interface MyMoneyReconciliationApiModel {
  // 'YYYY-MM'
  month: string;
  from: string;
  to: string;
  rows: MyMoneyReconciliationRowApiModel[];
  paidOnlyInMyEvents: MyMoneyReconciliationInstallmentApiModel[];
  pendingInBoth: MyMoneyReconciliationInstallmentApiModel[];
}

export interface MyMoneyReconciliationApplyResultApiModel {
  reconciled: number;
  paid: number;
  failed: { importedMovementId: number; message: string }[];
  reconciliation: MyMoneyReconciliationApiModel;
}

export interface ApplyMyMoneyReconciliationApiRequest {
  month: string;
  items: { importedMovementId: number; installmentIds: number[]; markAsPaid: boolean }[];
}
