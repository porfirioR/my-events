import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpsertMyMoneyDescriptionRuleApiRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  pattern: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  accountId?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  savingsGoalId?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  loanId?: number | null;
}
