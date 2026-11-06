import { IsDateString, IsInt, IsOptional, IsPositive } from 'class-validator';

export class WithdrawSavingsGoalApiRequest {
  @IsOptional()
  @IsInt()
  @IsPositive()
  payoutAmount?: number;

  @IsDateString()
  payoutDate: string;

  // Cuenta por la que salió o entró la plata; sin cuenta no se toca ningún saldo
  @IsOptional()
  @IsInt()
  @IsPositive()
  accountId?: number;
}
