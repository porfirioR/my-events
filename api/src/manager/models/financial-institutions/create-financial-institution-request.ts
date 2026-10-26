export class CreateFinancialInstitutionRequest {
  constructor(
    public readonly userId: number,
    public readonly name: string,
    public readonly type: number,
  ) {}
}
