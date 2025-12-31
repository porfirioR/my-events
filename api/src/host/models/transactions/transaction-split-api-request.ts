import { IsEnum, IsNumber, IsOptional, Min, Max, IsBoolean } from 'class-validator';
import { ParticipantType } from '../../../utility/enums';

export class TransactionSplitApiRequest {
  @IsEnum(ParticipantType, {
    message: 'participantType debe ser "user" o "collaborator"'
  })
  participantType: ParticipantType;

  @IsNumber({}, { message: 'amount debe ser un número' })
  @Min(0, { message: 'amount no puede ser negativo' })
  amount: number;

  @IsOptional()
  @IsNumber({}, { message: 'sharePercentage debe ser un número' })
  @Min(0, { message: 'sharePercentage debe ser al menos 0' })
  @Max(100, { message: 'sharePercentage no puede exceder 100' })
  sharePercentage?: number;

  @IsBoolean({ message: 'isPayer debe ser un booleano' })
  isPayer: boolean;
}