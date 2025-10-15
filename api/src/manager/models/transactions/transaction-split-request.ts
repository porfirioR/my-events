import { ParticipantType } from '../../../utility/enums';

export class TransactionSplitRequest {
  constructor(
    public participantType: ParticipantType,
    public userId: number | null,
    public collaboratorId: number | null,
    public amount: number,
    public sharePercentage: number | null,
    public isPayer: boolean
  ) {}
}
