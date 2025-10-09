import { IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class ReimbursementApiRequest {
  @IsNumber({}, { message: 'El monto del reintegro debe ser un número' })
  @Min(0.01, { message: 'El monto del reintegro debe ser mayor a 0' })
  amount: number;

  @IsOptional()
  @IsString({ message: 'La descripción debe ser texto' })
  description?: string;
}