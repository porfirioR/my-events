import { IsDateString, IsInt, IsOptional, IsPositive } from 'class-validator';

export class WithdrawSavingsGoalApiRequest {
  @IsOptional()
  @IsInt()
  @IsPositive()
  payoutAmount?: number;

  @IsDateString()
  payoutDate: string;
}
