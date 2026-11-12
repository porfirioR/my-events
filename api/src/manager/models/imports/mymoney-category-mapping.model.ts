// Clasificación de una categoría de MyMoney (#231).
// movementType: MyMoneyMovementTypeEnum (1 gasto, 2 ingreso); kind: MyMoneyCategoryKind.
export class MyMoneyCategoryMappingModel {
  constructor(
    public readonly id: number,
    public readonly categoryExternalId: string,
    public readonly categoryName: string,
    public readonly movementType: number,
    public readonly kind: number,
    public readonly isEssential: boolean,
    public readonly isExtraordinary: boolean,
    public readonly accountId: number | null,
    public readonly savingsGoalId: number | null,
    public readonly loanId: number | null,
    public readonly needsReview: boolean,
  ) {}
}
