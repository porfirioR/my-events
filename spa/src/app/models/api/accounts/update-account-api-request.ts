export class UpdateAccountApiRequest {
  constructor(
    public institutionId: number,
    public currencyId: number,
    public name: string,
    public type: number,
    public isActive: boolean,
    public notes: string | null,
  ) {}
}
