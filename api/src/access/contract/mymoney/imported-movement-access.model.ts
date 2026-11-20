export class ImportedMovementAccessModel {
  constructor(
    public readonly id: number,
    public readonly externalId: string,
    public readonly categoryExternalId: string,
    // 'YYYY-MM-DD'
    public readonly date: string,
    public readonly movementType: number,
    public readonly amount: number,
    public readonly note: string,
  ) {}
}
