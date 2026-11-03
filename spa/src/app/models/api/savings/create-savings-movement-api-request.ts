export class CreateSavingsMovementApiRequest {
  constructor(
    public amount: number,
    public movementType: number,
    public description?: string,
    public date?: string
  ) {}
}
