import { IsArray, IsDateString, IsEnum, IsInt, IsNumber, IsPositive, IsString, MaxLength, Min } from 'class-validator';
import { TravelSplitType } from '../../../utility/enums';

export class UpdateTravelOperationApiRequest {
  @IsInt()
  @IsPositive()
  currencyId: number;

  @IsInt()
  @IsPositive()
  paymentMethodId: number;

  @IsInt()
  @IsPositive()
  whoPaidMemberId: number;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  @MaxLength(255)
  description: string;

  @IsEnum(TravelSplitType)
  splitType: TravelSplitType;

  @IsDateString()
  transactionDate: string;

  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  participantMemberIds: number[];

  @IsNumber()
  @IsPositive()
  categoryId: number;
}