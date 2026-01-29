import { ArrayMinSize, IsArray, IsDateString, IsEnum, IsInt, IsNumber, IsPositive, IsString, MaxLength, Min, ValidateIf } from 'class-validator';
import { SplitType, TravelParticipantType } from '../../../utility/enums';

export class CreateTravelOperationApiRequest {
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

  @IsEnum(TravelParticipantType)
  participantType: TravelParticipantType;

  @IsEnum(SplitType)
  splitType: SplitType;

  @IsDateString()
  transactionDate: string;

  @ValidateIf(x => x.participantType === TravelParticipantType.Selected)
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(1, { each: true })
  participantMemberIds: number[];

  @ValidateIf(x => x.splitType === SplitType.CUSTOM)
  @IsArray()
  @IsNumber({}, { each: true })
  @IsPositive({ each: true })
  customAmounts?: number[];

  @ValidateIf(x => x.splitType === SplitType.PERCENTAGE)
  @IsArray()
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  customPercentages?: number[];

  @IsNumber()
  @IsPositive()
  categoryId: number
}