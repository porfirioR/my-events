import { MyMoneyLinkTarget } from './mymoney-link-target';

// Guardar la clasificación también la saca de "a revisar"
export class UpdateMyMoneyCategoryMappingAccessRequest {
  constructor(
    public readonly id: number,
    public readonly userId: number,
    public readonly kind: number,
    public readonly isEssential: boolean,
    public readonly isExtraordinary: boolean,
    public readonly target: MyMoneyLinkTarget,
  ) {}
}
