import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateLoanApiRequest {
  @IsInt()
  currencyId: number;

  @IsInt()
  loanTypeId: number;

  @IsInt()
  loanEntityId: number;

  @IsOptional()
  @IsString()
  lenderCustomName?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(1)
  principalAmount: number;

  @IsNumber()
  @Min(0)
  @Max(999)
  annualRatePercentage: number;

  @IsInt()
  @Min(1)
  numberOfInstallments: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  actualInstallmentAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  actualTotalAmount?: number;

  @IsString()
  amortizationType: string;

  @IsString()
  startDate: string;
}
