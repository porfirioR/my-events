// update-travel-operation-api.request.ts (ACTUALIZAR EXISTENTE)
import { 
  IsArray, 
  IsDateString, 
  IsEnum, 
  IsInt, 
  IsNumber, 
  IsPositive, 
  IsString, 
  MaxLength, 
  Min,
  IsOptional,
  ValidateIf,
  ArrayMinSize
} from 'class-validator';
import { TravelParticipantType, SplitType } from '../../../utility/enums';

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

  @IsEnum(TravelParticipantType)
  participantType: TravelParticipantType;

  @IsEnum(SplitType)
  splitType: SplitType;

  @IsDateString()
  transactionDate: string;

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
  @IsOptional()
  categoryId?: number;
}