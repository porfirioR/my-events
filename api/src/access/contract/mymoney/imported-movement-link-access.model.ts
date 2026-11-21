// Vínculo entre un movimiento importado de MyMoney y una cuota que paga (#233); a lo sumo una de las dos
export class ImportedMovementLinkAccessModel {
  constructor(
    public readonly id: number,
    public readonly importedMovementId: number,
    public readonly savingsInstallmentId: number | null,
    public readonly loanInstallmentId: number | null,
  ) {}
}
