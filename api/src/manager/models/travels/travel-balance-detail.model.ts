export class TravelBalanceDetailModel {
  constructor(
    public memberId: number,
    public memberName: string,
    public totalPaid: number, // Total que pagó este miembro
    public totalOwed: number, // Total que debe pagar este miembro
    public balance: number, // Diferencia (positivo = le deben, negativo = debe)
    public debtsToOthers: DebtDetailModel[], // A quiénes debe
    public creditsFromOthers: CreditDetailModel[], // Quiénes le deben
  ) {}
}

export class DebtDetailModel {
  constructor(
    public creditorMemberId: number,
    public creditorMemberName: string,
    public amount: number,
  ) {}
}

export class CreditDetailModel {
  constructor(
    public debtorMemberId: number,
    public debtorMemberName: string,
    public amount: number,
  ) {}
}