export class FinancialInstitutionApiModel {
  constructor(
    public id: number,
    public userId: number | null,
    public name: string,
    public isOther: boolean,
    public type: number,
  ) {}
}
