import { ProgressionType } from '../enums';

export class SavingsCalculatorHelper {
  /**
   * Calcula el monto total para progresiones aritméticas usando n(n+1)/2
   * @param progressionTypeId - ID del tipo de progresión
   * @param baseAmount - Monto base
   * @param numberOfInstallments - Número de cuotas
   * @param incrementAmount - Incremento (opcional)
   * @returns Monto total calculado
   */
  static calculateTargetAmount(
    progressionTypeId: number,
    baseAmount: number,
    numberOfInstallments: number,
    incrementAmount?: number
  ): number {
    const n = numberOfInstallments;

    switch (progressionTypeId) {
      case ProgressionType.Fixed: // Fixed
        return n * baseAmount;

      case ProgressionType.Ascending: // Ascending
      case ProgressionType.Descending: // Descending
        if (!incrementAmount) {
          throw new Error(
            'incrementAmount is required for Ascending/Descending types'
          );
        }
        // Fórmula: n × base + (n × (n-1) × incremento / 2)
        return n * baseAmount + (n * (n - 1) * incrementAmount) / 2;

      case ProgressionType.Random: // Random
        if (incrementAmount) {
          return n * baseAmount + (n * (n - 1) * incrementAmount) / 2;
        }
        return n * baseAmount;

      case ProgressionType.FreeForm: // FreeForm
        throw new Error(
          'FreeForm type does not calculate target amount automatically'
        );

      default:
        throw new Error(`Invalid progression type: ${progressionTypeId}`);
    }
  }

  /**
   * Calcula los montos de todas las cuotas según el tipo de progresión
   * @param progressionTypeId - ID del tipo de progresión
   * @param baseAmount - Monto base
   * @param numberOfInstallments - Número de cuotas
   * @param incrementAmount - Incremento (opcional)
   * @returns Array con los montos de cada cuota
   */
  static calculateInstallmentAmounts(
    progressionTypeId: number,
    baseAmount: number,
    numberOfInstallments: number,
    incrementAmount?: number
  ): number[] {
    switch (progressionTypeId) {
      case ProgressionType.Fixed: // Fixed
        return this.calculateFixed(baseAmount, numberOfInstallments);

      case ProgressionType.Ascending: // Ascending
        if (!incrementAmount) {
          throw new Error('incrementAmount is required for Ascending type');
        }
        return this.calculateAscending(
          baseAmount,
          numberOfInstallments,
          incrementAmount
        );

      case ProgressionType.Descending: // Descending
        if (!incrementAmount) {
          throw new Error('incrementAmount is required for Descending type');
        }
        return this.calculateDescending(
          baseAmount,
          numberOfInstallments,
          incrementAmount
        );

      case ProgressionType.Random: // Random
        return this.calculateRandom(
          baseAmount,
          numberOfInstallments,
          incrementAmount
        );

      case ProgressionType.FreeForm: // FreeForm
        return []; // FreeForm no tiene cuotas predefinidas

      default:
        throw new Error(`Invalid progression type: ${progressionTypeId}`);
    }
  }

  /**
   * Genera nuevas cuotas para tipos que permiten expansión (Ascending, Random, Fixed)
   * @param progressionTypeId - ID del tipo de progresión
   * @param lastAmount - Último monto pagado
   * @param increment - Incremento
   * @param count - Cantidad de nuevas cuotas
   * @returns Array con los montos de las nuevas cuotas
   */
  static generateAdditionalInstallments(
    progressionTypeId: number,
    lastAmount: number,
    increment: number,
    count: number
  ): number[] {
    if (progressionTypeId === ProgressionType.Descending) {
      // Descending
      throw new Error('Cannot add installments to Descending type');
    }

    if (progressionTypeId === ProgressionType.Fixed) {
      // Fixed
      return Array(count).fill(lastAmount);
    }

    if (progressionTypeId === ProgressionType.Ascending) {
      // Ascending
      const amounts: number[] = [];
      for (let i = 0; i < count; i++) {
        amounts.push(lastAmount + (i + 1) * increment);
      }
      return amounts;
    }

    if (progressionTypeId === ProgressionType.Random) {
      // Random
      const amounts: number[] = [];
      for (let i = 0; i < count; i++) {
        amounts.push(lastAmount + (i + 1) * increment);
      }
      return this.shuffleArray(amounts);
    }

    throw new Error(`Cannot add installments for type: ${progressionTypeId}`);
  }

  /**
   * Calcula el progreso hacia la meta (porcentaje)
   */
  static calculateProgress(
    currentAmount: number,
    targetAmount: number
  ): number {
    if (targetAmount === 0) return 0;
    return Math.min(Math.round((currentAmount / targetAmount) * 100), 100);
  }

  /**
   * Calcula cuánto falta para alcanzar la meta
   */
  static calculateRemaining(
    currentAmount: number,
    targetAmount: number
  ): number {
    return Math.max(targetAmount - currentAmount, 0);
  }

  // ===== Métodos privados =====

  private static calculateFixed(baseAmount: number, count: number): number[] {
    return Array(count).fill(baseAmount);
  }

  private static calculateAscending(
    baseAmount: number,
    count: number,
    increment: number
  ): number[] {
    const amounts: number[] = [];
    for (let i = 0; i < count; i++) {
      amounts.push(baseAmount + i * increment);
    }
    return amounts;
  }

  private static calculateDescending(
    baseAmount: number,
    count: number,
    increment: number
  ): number[] {
    const amounts: number[] = [];
    const startAmount = baseAmount + (count - 1) * increment;
    for (let i = 0; i < count; i++) {
      amounts.push(startAmount - i * increment);
    }
    return amounts;
  }

  private static calculateRandom(
    baseAmount: number,
    count: number,
    increment?: number
  ): number[] {
    const pivot = increment || baseAmount;
    const amounts = this.calculateAscending(baseAmount, count, pivot);
    return this.shuffleArray([...amounts]);
  }

  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}
