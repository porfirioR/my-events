import { IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class PayInstallmentApiRequest {
  @IsInt()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  // Cuenta por la que salió o entró la plata; sin cuenta no se toca ningún saldo
  @IsOptional()
  @IsInt()
  @IsPositive()
  accountId?: number;
}