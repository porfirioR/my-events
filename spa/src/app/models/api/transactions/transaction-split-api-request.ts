import { ParticipantType } from "../../enums";

export class TransactionSplitApiRequest {
  constructor(
    public participantType: ParticipantType,
    public amount: number,
    public isPayer: boolean,
    public sharePercentage?: number | null
  ) {}
}
