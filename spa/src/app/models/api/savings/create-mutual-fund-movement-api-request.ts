export class CreateMutualFundMovementApiRequest {
  constructor(
    public amount: number,
    public movementType: number,
    public description?: string,
    public date?: string
  ) {}
}
