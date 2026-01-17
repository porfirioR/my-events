export class TravelBalanceSimplifiedModel {
  constructor(
    public memberId: number,
    public memberName: string,
    public settlements: SettlementModel[], // Lista de liquidaciones para este miembro
  ) {}
}

export class SettlementModel {
  constructor(
    public otherMemberId: number,
    public otherMemberName: string,
    public amount: number,
    public direction: 'owes' | 'receives', // 'owes' = debe pagar, 'receives' = debe recibir
  ) {}
}