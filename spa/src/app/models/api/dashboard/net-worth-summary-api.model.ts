import { NetWorthItemType, NetWorthLiquidity } from '../../enums';

export interface NetWorthInstitutionApiModel {
  institutionId: number | null;
  institutionName: string | null;
  assets: number;
  liabilities: number;
  total: number;
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
