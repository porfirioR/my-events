export class CreateFreeFormDepositApiRequest {
  constructor(
    public amount: number,
    public description?: string
  ) {}
}