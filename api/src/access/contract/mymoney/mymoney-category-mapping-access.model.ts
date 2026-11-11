import { MyMoneyLinkTarget } from './mymoney-link-target';

export class MyMoneyCategoryMappingAccessModel {
  constructor(
    public readonly id: number,
    public readonly userId: number,
    public readonly categoryExternalId: string,
    public readonly categoryName: string,
    public readonly movementType: number,
    public readonly kind: number,
    public readonly isEssential: boolean,
    public readonly isExtraordinary: boolean,
    public readonly target: MyMoneyLinkTarget,
    public readonly needsReview: boolean,
  ) {}
}
