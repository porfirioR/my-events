
export class TransactionSplitRequest {
  constructor(
    public participantType: 'user' | 'collaborator',
    public userId: number | null,
    public collaboratorId: number | null,
    public amount: number,
    public sharePercentage: number | null,
    public isPayer: boolean,
  ) {}
}