import { ReconciliationStatus, ReconciliationTargetKind } from '../../../utility/helpers/mymoney-reconciliation.helper';

// Conciliación de un mes (#233): cada transferencia de MyMoney a un ahorro o préstamo con su cuota,
// y las diferencias en el otro sentido.

export interface MyMoneyReconciliationInstallmentModel {
  id: number;
  targetKind: ReconciliationTargetKind;
  targetId: number;
  targetName: string;
  number: number;
  amount: number;
  dueDate: string | null;
  // 1 Pending, 2 Paid, 3 Skipped
  statusId: number;
  paidDate: string | null;
}

export interface MyMoneyReconciliationRowModel {
  importedMovementId: number;
  date: string;
  amount: number;
  note: string;
  targetKind: ReconciliationTargetKind;
  targetId: number;
  targetName: string;
  status: ReconciliationStatus;
  noteNumber: number | null;
  amountDiffers: boolean;
  dateDiffers: boolean;
  // Casi siempre una; un aporte mensual puede pagar varias cuotas
  installments: MyMoneyReconciliationInstallmentModel[];
}

export interface MyMoneyReconciliationModel {
  // 'YYYY-MM'
  month: string;
  from: string;
  to: string;
  rows: MyMoneyReconciliationRowModel[];
  paidOnlyInMyEvents: MyMoneyReconciliationInstallmentModel[];
  pendingInBoth: MyMoneyReconciliationInstallmentModel[];
}

export interface MyMoneyReconciliationFailureModel {
  importedMovementId: number;
  message: string;
}

export interface MyMoneyReconciliationApplyResultModel {
  reconciled: number;
  // Cuotas que además se marcaron como pagadas en my-events
  paid: number;
  failed: MyMoneyReconciliationFailureModel[];
  reconciliation: MyMoneyReconciliationModel;
}

// Lo que el usuario confirma de la propuesta: installmentIds tienen que ser las cuotas propuestas
export interface ApplyMyMoneyReconciliationItem {
  importedMovementId: number;
  installmentIds: number[];
  markAsPaid: boolean;
}
