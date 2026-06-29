import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

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
  @Max(4)
  statusId: number;
}
