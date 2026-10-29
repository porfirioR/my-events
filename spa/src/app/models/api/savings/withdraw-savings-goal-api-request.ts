export class WithdrawSavingsGoalApiRequest {
  constructor(
    public payoutDate: string,
    public payoutAmount?: number,
  ) {}
}
