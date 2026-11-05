import { NetWorthItemType, NetWorthLiquidity } from '../../../utility/enums';

// Cuenta, meta de ahorro o préstamo dentro de una entidad
export class NetWorthItemModel {
  constructor(
    public type: NetWorthItemType,
    public sourceId: number,
    public name: string,
    public liquidity: NetWorthLiquidity | null, // null = deuda
    public amount: number,
    public availableDate: string | null, // cuándo se libera lo bloqueado / se termina de cobrar lo prestado
  ) {}
}

export class NetWorthInstitutionModel {
  constructor(
    public institutionId: number | null,
    public institutionName: string | null,
    public assets: number,
    public liabilities: number,
    public total: number,
    public byLiquidity: { liquidity: NetWorthLiquidity; amount: number }[],
    public items: NetWorthItemModel[],
  ) {}
}

export class NetWorthCurrencyModel {
  constructor(
    public currencyId: number,
    public total: number,
    public assets: number,
    public liabilities: number,
    public byInstitution: NetWorthInstitutionModel[],
    public byLiquidity: { liquidity: NetWorthLiquidity; amount: number }[],
    public byType: { type: NetWorthItemType; amount: number }[],
  ) {}
}

export class NetWorthSummaryModel {
  constructor(
    // Un bloque por moneda: no se suman guaraníes con dólares
    public currencies: NetWorthCurrencyModel[],
    // Mes del último saldo cargado en cuentas activas ('YYYY-MM-DD')
    public lastSnapshotDate: string | null,
    // Cuentas activas sin ningún saldo cargado (no suman al patrimonio)
    public accountsWithoutBalance: number,
  ) {}
}
