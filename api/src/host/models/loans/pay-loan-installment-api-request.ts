import { IsDateString, IsInt, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';

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

  // Cuenta por la que entró (otorgado) o salió (recibido) la plata; sin cuenta no se toca ningún saldo
  @IsOptional()
  @IsInt()
  @IsPositive()
  accountId?: number;
}
