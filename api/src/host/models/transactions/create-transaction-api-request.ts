import { SplitType, WhoPaid } from '../../../utility/enums';
import { ReimbursementApiRequest, TransactionSplitApiRequest } from '.';
import {
  IsNumber,
  IsString,
  IsEnum,
  IsArray,
  ValidateNested,
  IsOptional,
  Min,
  ArrayMinSize,
  ArrayMaxSize
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTransactionApiRequest {
  @IsNumber({}, { message: 'collaboratorId debe ser un número' })
  collaboratorId: number;

  @IsNumber({}, { message: 'totalAmount debe ser un número' })
  @Min(0.01, { message: 'totalAmount debe ser mayor a 0' })
  totalAmount: number;

  @IsOptional()
  @IsString({ message: 'description debe ser texto' })
  description?: string;

  @IsEnum(SplitType, {
    message: 'splitType debe ser Equal, Custom o Percentage'
  })
  splitType: SplitType;

  @IsEnum(WhoPaid, {
    message: 'whoPaid debe ser "user" o "collaborator"'
  })
  whoPaid: WhoPaid;

  @IsArray({ message: 'splits debe ser un array' })
  @ArrayMinSize(2, { message: 'Debe haber exactamente 2 participantes' })
  @ArrayMaxSize(2, { message: 'Debe haber exactamente 2 participantes' })
  @ValidateNested({ each: true })
  @Type(() => TransactionSplitApiRequest)
  splits: TransactionSplitApiRequest[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ReimbursementApiRequest)
  reimbursement?: ReimbursementApiRequest;
}
