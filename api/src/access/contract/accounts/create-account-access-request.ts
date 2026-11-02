export class CreateAccountAccessRequest {
  constructor(
    public readonly userId: number,
    public readonly institutionId: number,
    public readonly currencyId: number,
    public readonly name: string,
    public readonly type: number,
    public readonly notes: string | null,
  ) {}
}
