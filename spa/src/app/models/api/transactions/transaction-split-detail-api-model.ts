import { ParticipantType } from '../../enums';

export class TransactionSplitDetailApiModel {
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
