import { ParticipantType } from '../../../enums';

export class TransactionSplitApiRequest {
  constructor(
    public participantType: ParticipantType,
    public amount: number,
    public sharePercentage?: number | null
  ) {}
}
