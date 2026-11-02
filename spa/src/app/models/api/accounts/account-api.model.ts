export class AccountApiModel {
  constructor(
    public id: number,
    public userId: number,
    public institutionId: number,
    public currencyId: number,
    public name: string,
    public type: number,
    public isActive: boolean,
    public notes: string | null,
    // Saldo actual = último snapshot; null si todavía no se cargó ningún mes
    public currentBalance: number | null,
    public lastSnapshotDate: string | null,
  ) {}
}
