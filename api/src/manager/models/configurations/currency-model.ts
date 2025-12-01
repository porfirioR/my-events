export class CurrencyModel {
  constructor(
    public id: number,
    public name: string,
    public symbol: string,
    public country: string,
    public locale: string,
    public currencyCode: string,
    public minimumDecimal: number,
  ) {}
}
