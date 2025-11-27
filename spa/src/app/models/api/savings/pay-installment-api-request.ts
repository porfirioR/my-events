export class PayInstallmentApiRequest {
  constructor(
    public amount: number,
    public description?: string
  ) {}
}