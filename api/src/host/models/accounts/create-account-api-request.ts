import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateAccountApiRequest {
  @IsInt()
  @Min(1)
  institutionId: number;

  @IsInt()
  @Min(1)
  currencyId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  // 1 Checking, 2 SavingsAccount, 3 Cash
  @IsInt()
  @Min(1)
  @Max(3)
  type: number;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
