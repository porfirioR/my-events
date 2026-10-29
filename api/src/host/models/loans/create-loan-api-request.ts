import { IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min, MinLength, ValidateIf } from 'class-validator';


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

  // En 'flat' se usa totalRatePercentage y la tasa anual la calcula el backend
  @ValidateIf(o => o.amortizationType !== 'flat')
  @IsNumber()
  @Min(0)
  @Max(999)
  annualRatePercentage: number;

  @ValidateIf(o => o.amortizationType === 'flat')
  @IsNumber()
  @Min(0)
  @Max(999)
  totalRatePercentage?: number;

  // 1 Borrowed (me prestan), 2 Lent (yo presto). Default: Borrowed
  @IsOptional()
  @IsIn([1, 2])
  direction?: number;

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

  @IsOptional()
  @IsNumber()
  @Min(0)
  administrativeFees?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  ivaPercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  insuranceAmount?: number;
}
