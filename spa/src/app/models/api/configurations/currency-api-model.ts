import { BaseConfigurationApiModel } from ".."

export interface CurrencyApiModel extends BaseConfigurationApiModel {
  symbol: string
  country: string
  locale: string,
  currencyCode: string,
  minimumDecimal: number,
}
