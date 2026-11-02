import { IsInt, Min } from 'class-validator';

export class AccountBalanceItemApiRequest {
  @IsInt()
  @Min(1)
  accountId: number;

  // Puede ser negativo (sobregiro)
  @IsInt()
  balance: number;
}
