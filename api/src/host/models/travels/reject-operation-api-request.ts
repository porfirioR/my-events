import { IsString, MaxLength } from 'class-validator';

export class RejectOperationApiRequest {
  @IsString()
  @MaxLength(500)
  rejectionReason: string;
}