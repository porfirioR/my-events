export class UpdateFinancialInstitutionRequest {
  constructor(
    public readonly id: number,
    public readonly userId: number,
    public readonly name: string,
    public readonly type: number,
  ) {}
}
