import { MyMoneyLinkTarget } from './mymoney-link-target';

// id null → crear
export class UpsertMyMoneyDescriptionRuleAccessRequest {
  constructor(
    public readonly id: number | null,
    public readonly userId: number,
    public readonly pattern: string,
    public readonly target: MyMoneyLinkTarget,
  ) {}
}
