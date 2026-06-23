import { IsInt, IsNotEmpty, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdateLoanApiRequest {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  loanTypeId: number;

  @IsInt()
  @Min(1)
  statusId: number;
}
