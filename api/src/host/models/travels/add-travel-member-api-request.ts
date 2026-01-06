import { IsInt, IsPositive } from 'class-validator';

export class AddTravelMemberApiRequest {
  @IsInt()
  @IsPositive()
  collaboratorId: number;
}