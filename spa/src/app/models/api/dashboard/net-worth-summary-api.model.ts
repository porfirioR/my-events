import { NetWorthItemType, NetWorthLiquidity } from '../../enums';

// Cuenta, meta de ahorro o préstamo dentro de una entidad
export interface NetWorthItemApiModel {
  type: NetWorthItemType;
  sourceId: number;
  name: string;
  liquidity: NetWorthLiquidity | null; // null = deuda
  amount: number;
  availableDate: string | null; // 'YYYY-MM-DD': cuándo se libera lo bloqueado / se termina de cobrar lo prestado
}

export interface NetWorthInstitutionApiModel {
  institutionId: number | null;
  institutionName: string | null;
  assets: number;
  liabilities: number;
  total: number;
  byLiquidity: { liquidity: NetWorthLiquidity; amount: number }[];
  items: NetWorthItemApiModel[];
}

export interface NetWorthCurrencyApiModel {
  currencyId: number;
  total: number;
  assets: number;
  liabilities: number;
  byInstitution: NetWorthInstitutionApiModel[];
  byLiquidity: { liquidity: NetWorthLiquidity; amount: number }[];
  byType: { type: NetWorthItemType; amount: number }[];
}

export interface NetWorthSummaryApiModel {
  // Un bloque por moneda: no se suman guaraníes con dólares
  currencies: NetWorthCurrencyApiModel[];
  lastSnapshotDate: string | null;
  accountsWithoutBalance: number;
}
