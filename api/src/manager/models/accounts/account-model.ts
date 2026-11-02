export class AccountModel {
  constructor(
    public readonly id: number,
    public readonly userId: number,
    public readonly institutionId: number,
    public readonly currencyId: number,
    public readonly name: string,
    public readonly type: number,
    public readonly isActive: boolean,
    public readonly notes: string | null,
    // Saldo actual = último snapshot; null si todavía no se cargó ningún mes
    public readonly currentBalance: number | null,
    public readonly lastSnapshotDate: string | null,
  ) {}
}
