export interface DebtDetailApiModel {
  creditorMemberId: number;
  creditorMemberName: string;
  amount: number;
}

export interface CreditDetailApiModel {
  debtorMemberId: number;
  debtorMemberName: string;
  amount: number;
}

export interface TravelBalanceDetailApiModel {
  memberId: number;
  memberName: string;
  totalPaid: number;
  totalOwed: number;
  balance: number;
  debtsToOthers: DebtDetailApiModel[];
  creditsFromOthers: CreditDetailApiModel[];
}

export interface SettlementApiModel {
  otherMemberId: number;
  otherMemberName: string;
  amount: number;
  direction: 'owes' | 'receives';
}

export interface TravelBalanceSimplifiedApiModel {
  memberId: number;
  memberName: string;
  settlements: SettlementApiModel[];
}

export interface TravelBalanceByCurrencyApiModel {
  currencyId: number;
  currencySymbol: string;
  currencyName: string;
  detailedBalances: TravelBalanceDetailApiModel[];
  simplifiedBalances: TravelBalanceSimplifiedApiModel[];
}