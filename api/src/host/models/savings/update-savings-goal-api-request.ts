import { IsDateString, IsInt, IsNumber, IsOptional, IsPositive, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateSavingsGoalApiRequest {
  @IsInt()
  @IsPositive()
  id: number;

  @IsInt()
  @IsPositive()
  currencyId: number;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsInt()
  @IsPositive()
  targetAmount: number;

  @IsInt()
  @IsPositive()
  progressionTypeId: number;

  @IsInt()
  @IsPositive()
  statusId: number;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  numberOfInstallments?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  baseAmount?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  incrementAmount?: number;

  @IsOptional()
  @IsDateString()
  expectedEndDate?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  frequencyId?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100)
  annualRatePercentage?: number;
}