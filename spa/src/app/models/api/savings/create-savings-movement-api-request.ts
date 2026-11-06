export class CreateSavingsMovementApiRequest {
  constructor(
    public amount: number,
    public movementType: number,
    public description?: string,
    public date?: string,
    // Cuenta de la que sale el depósito o a la que entra el retiro
    public accountId?: number,
  ) {}
}
