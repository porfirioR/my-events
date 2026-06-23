import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class PayLoanInstallmentApiRequest {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  paymentDate?: string;
}
