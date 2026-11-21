import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsInt, Matches, Min, ValidateNested } from 'class-validator';

export class ApplyMyMoneyReconciliationItemApiRequest {
  @IsInt()
  @Min(1)
  importedMovementId: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsInt({ each: true })
  @Min(1, { each: true })
  installmentIds: number[];

  @IsBoolean()
  markAsPaid: boolean;
}

export class ApplyMyMoneyReconciliationApiRequest {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  month: string;

  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ApplyMyMoneyReconciliationItemApiRequest)
  items: ApplyMyMoneyReconciliationItemApiRequest[];
}
