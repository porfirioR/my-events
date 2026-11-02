export class AccountBalanceSnapshotApiModel {
  constructor(
    public id: number,
    public accountId: number,
    // 'YYYY-MM-DD', siempre el día 1 del mes
    public snapshotDate: string,
    public balance: number,
  ) {}
}
