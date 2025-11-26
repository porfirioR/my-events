import { IsInt, IsPositive } from 'class-validator';

export class AddInstallmentsApiRequest {
  @IsInt()
  @IsPositive()
  numberOfNewInstallments: number;
}