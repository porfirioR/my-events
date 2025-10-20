import { IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class AddReimbursementApiRequest {
  @IsNumber({}, { message: 'El monto debe ser un número' })
  @Min(0.01, { message: 'El monto debe ser mayor a 0' })
  amount: number;

  @IsOptional()
  @IsString({ message: 'La descripción debe ser texto' })
  description?: string;
}