import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateMyMoneyCategoryMappingApiRequest {
  // MyMoneyCategoryKind: 1 Consumption, 2 Transfer, 3 Income, 4 Refund
  @IsInt()
  @Min(1)
  @Max(4)
  kind: number;

  @IsBoolean()
  isEssential: boolean;

  @IsBoolean()
  isExtraordinary: boolean;

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
