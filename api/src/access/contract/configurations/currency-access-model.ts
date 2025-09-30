export class CurrencyAccessModel {
  constructor(
    public id: number,
    public name: string,
    public symbol: string,
    public country: string
  ) {}
}