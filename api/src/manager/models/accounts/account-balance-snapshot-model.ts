export class AccountBalanceSnapshotModel {
  constructor(
    public readonly id: number,
    public readonly accountId: number,
    // 'YYYY-MM-DD', siempre el día 1 del mes
    public readonly snapshotDate: string,
    public readonly balance: number,
  ) {}
}
