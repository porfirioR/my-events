import { IsDateString, IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

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
}