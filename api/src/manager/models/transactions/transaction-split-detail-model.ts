import { ParticipantType } from '../../../utility/enums';

export class TransactionSplitDetailModel {
  constructor(
    public id: number,
    public participantType: ParticipantType,
    public participantName: string,
    public amount: number,
    public sharePercentage: number | null,
    public isPayer: boolean,
    public isSettled: boolean
  ) {}
}
