export class CreateAccountApiRequest {
  constructor(
    public institutionId: number,
    public currencyId: number,
    public name: string,
    public type: number,
    public notes: string | null,
  ) {}
}
