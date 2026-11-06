export class WithdrawSavingsGoalApiRequest {
  constructor(
    public payoutDate: string,
    public payoutAmount?: number,
    // Cuenta a la que entra lo cobrado; sin cuenta no se toca ningún saldo
    public accountId?: number,
  ) {}
}
