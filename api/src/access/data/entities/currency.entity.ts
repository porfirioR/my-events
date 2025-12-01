export class CurrencyEntity {
  public id: number
  constructor(
    public name: string,
    public symbol: string,
    public country: string,
    public locale: string,
    public currencycode: string,
    public minimumdecimal: number,
  ) {}
}