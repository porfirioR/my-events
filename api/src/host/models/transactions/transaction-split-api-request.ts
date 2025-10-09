import { IsEnum, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class TransactionSplitApiRequest {
  @IsEnum(['user', 'collaborator'], {
    message: 'participantType debe ser "user" o "collaborator"'
  })
  participantType: 'user' | 'collaborator';

  @IsNumber({}, { message: 'amount debe ser un número' })
  @Min(0, { message: 'amount no puede ser negativo' })
  amount: number;

  @IsOptional()
  @IsNumber({}, { message: 'sharePercentage debe ser un número' })
  @Min(0, { message: 'sharePercentage debe ser al menos 0' })
  @Max(100, { message: 'sharePercentage no puede exceder 100' })
  sharePercentage?: number;
}