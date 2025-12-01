import { IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class PayInstallmentApiRequest {
  @IsInt()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}