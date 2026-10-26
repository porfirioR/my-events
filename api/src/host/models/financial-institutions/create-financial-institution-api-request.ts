import { IsInt, IsNotEmpty, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateFinancialInstitutionApiRequest {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @IsInt()
  @Min(1)
  @Max(5)
  type: number;
}
