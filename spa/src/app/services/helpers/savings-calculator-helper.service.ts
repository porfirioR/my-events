import { ProgressionType } from "../../models/enums";

export class SavingsCalculatorHelper {
  /**
   * Calcula el monto total para progresiones aritméticas
   */
  static calculateTargetAmount(
    progressionTypeId: number,
    baseAmount: number,
    numberOfInstallments: number,
    incrementAmount?: number
  ): number {
    const n = numberOfInstallments;

    switch (progressionTypeId) {
      case ProgressionType.Fixed:
        return n * baseAmount;

      case ProgressionType.Ascending:
      case ProgressionType.Descending:
        if (!incrementAmount) {
          throw new Error('incrementAmount is required for Ascending/Descending types');
        }
        // Fórmula: n × base + (n × (n-1) × incremento / 2)
        return (n * baseAmount) + (n * (n - 1) * incrementAmount / 2);

      case ProgressionType.Random:
        if (incrementAmount) {
          return (n * baseAmount) + (n * (n - 1) * incrementAmount / 2);
        }
        return n * baseAmount;

      case ProgressionType.FreeForm:
        throw new Error('FreeForm type does not calculate target amount automatically');

      default:
        throw new Error(`Invalid progression type: ${progressionTypeId}`);
    }
  }

  /**
   * Calcula el progreso hacia la meta (porcentaje)
   */
  static calculateProgress(currentAmount: number, targetAmount: number): number {
    if (targetAmount === 0) return 0;
    return Math.min(Math.round((currentAmount / targetAmount) * 100), 100);
  }

  /**
   * Calcula cuánto falta para alcanzar la meta
   */
  static calculateRemaining(currentAmount: number, targetAmount: number): number {
    return Math.max(targetAmount - currentAmount, 0);
  }

  /**
   * Valida si un tipo de progresión requiere incrementAmount
   */
  static requiresIncrement(progressionTypeId: number): boolean {
    return progressionTypeId === ProgressionType.Ascending || 
      progressionTypeId === ProgressionType.Descending;
  }

  /**
   * Valida si un tipo de progresión requiere cuotas
   */
  static requiresInstallments(progressionTypeId: number): boolean {
    return progressionTypeId !== ProgressionType.FreeForm;
  }

  /**
   * Valida si se pueden agregar más cuotas a un tipo de progresión
   */
  static canAddInstallments(progressionTypeId: number): boolean {
    return progressionTypeId !== ProgressionType.Descending && 
      progressionTypeId !== ProgressionType.FreeForm;
  }
}