import { MyMoneyLinkTarget } from './mymoney-link-target';

export class MyMoneyDescriptionRuleAccessModel {
  constructor(
    public readonly id: number,
    public readonly userId: number,
    public readonly pattern: string,
    public readonly target: MyMoneyLinkTarget,
  ) {}
}
