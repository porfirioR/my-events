import { TravelBalanceDetailModel, TravelBalanceSimplifiedModel } from ".";

export class TravelBalanceByCurrencyModel {
  constructor(
    public currencyId: number,
    public currencySymbol: string,
    public currencyName: string,
    public detailedBalances: TravelBalanceDetailModel[],
    public simplifiedBalances: TravelBalanceSimplifiedModel[],
  ) {}
}