export class CreateMyMoneyCategoryMappingAccessRequest {
  constructor(
    public readonly userId: number,
    public readonly categoryExternalId: string,
    public readonly categoryName: string,
    public readonly movementType: number,
    public readonly kind: number,
    public readonly isEssential: boolean,
    public readonly isExtraordinary: boolean,
    public readonly needsReview: boolean,
  ) {}
}
