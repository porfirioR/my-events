import { IsInt, IsNumber, Min, ValidateIf } from 'class-validator';

// chargedAmount y chargedCurrencyId en null = borrar el cobro registrado
export class RegisterOperationChargeApiRequest {
  @ValidateIf(o => o.chargedAmount !== null)
  @IsNumber()
  @Min(1)
  chargedAmount: number | null;

  @ValidateIf(o => o.chargedAmount !== null)
  @IsInt()
  chargedCurrencyId: number | null;
}
