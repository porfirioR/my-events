import { IsDateString, IsIn, IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { MovementType } from '../../../utility/enums';

export class CreateMutualFundMovementApiRequest {
  @IsInt()
  @IsPositive()
  amount: number;

  @IsIn([MovementType.Deposit, MovementType.Withdrawal])
  movementType: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}
