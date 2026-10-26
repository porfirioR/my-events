export class FinancialInstitutionModel {
  constructor(
    public readonly id: number,
    public readonly userId: number | null,
    public readonly name: string,
    public readonly isOther: boolean,
    public readonly type: number,
  ) {}
}
