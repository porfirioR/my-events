import { MovementType, ProgressionType } from '../enums';

const STATUS_ACTIVE = 1;
const STATUS_COMPLETED = 2;

export interface SavingsMovementGoalInput {
  progressionTypeId: number;
  statusId: number;
  currentAmount: number;
  targetAmount: number;
  // Fondo mutuo: saldo + interés máximo devengado (lo calcula SavingsCalculatorHelper)
  mutualFundMaxWithdrawal?: number;
}

export interface SavingsMovementResult {
  newCurrentAmount: number;
  // Estado nuevo si el movimiento lo cambia (completa la meta o la reabre); null si no cambia
  newStatusId: number | null;
}

/**
 * Reglas de depósitos y retiros parciales (forma libre y fondo mutuo).
 * Devuelve el saldo y el estado resultantes, o un mensaje de error si el movimiento no es válido.
 */
export class SavingsMovementHelper {
  static readonly supportedTypes: number[] = [ProgressionType.FreeForm, ProgressionType.MutualFund];

  static apply(goal: SavingsMovementGoalInput, movementType: number, amount: number): SavingsMovementResult | { error: string } {
    if (!SavingsMovementHelper.supportedTypes.includes(goal.progressionTypeId)) {
      return { error: 'Movements are only allowed for FreeForm and MutualFund savings goals' };
    }

    const isFreeForm = goal.progressionTypeId === ProgressionType.FreeForm;
    const isWithdrawal = movementType === MovementType.Withdrawal;

    // Una meta de forma libre completada todavía puede retirar (vuelve a Activa); depositar solo en Activa
    const allowedStatuses = isFreeForm && isWithdrawal ? [STATUS_ACTIVE, STATUS_COMPLETED] : [STATUS_ACTIVE];
    if (!allowedStatuses.includes(goal.statusId)) {
      return { error: 'Cannot add movements to inactive goals' };
    }

    if (isWithdrawal) {
      const maxWithdrawal = isFreeForm ? goal.currentAmount : (goal.mutualFundMaxWithdrawal ?? goal.currentAmount);
      if (amount > maxWithdrawal) {
        return {
          error: isFreeForm
            ? `Amount exceeds available balance (${maxWithdrawal})`
            : `Amount exceeds available balance plus maximum accrued interest (${maxWithdrawal})`,
        };
      }
      const newCurrentAmount = goal.currentAmount - amount;
      const reopens = isFreeForm && goal.statusId === STATUS_COMPLETED && newCurrentAmount < goal.targetAmount;
      return { newCurrentAmount, newStatusId: reopens ? STATUS_ACTIVE : null };
    }

    const newCurrentAmount = goal.currentAmount + amount;
    if (isFreeForm) {
      if (newCurrentAmount > goal.targetAmount) {
        return { error: `Deposit would exceed target. Remaining: ${goal.targetAmount - goal.currentAmount}` };
      }
      return { newCurrentAmount, newStatusId: newCurrentAmount >= goal.targetAmount ? STATUS_COMPLETED : null };
    }
    // Fondo mutuo no tiene meta: nunca se completa solo
    return { newCurrentAmount, newStatusId: null };
  }
}
