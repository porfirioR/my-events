import { CollaboratorSummaryModel } from '../collaborators';

export class BalanceModel {
  public collaboratorInfo: CollaboratorSummaryModel;

  constructor(
    public userId: number,
    public collaboratorId: number,
    public userOwes: number,
    public collaboratorOwes: number,
    public netBalance: number
  ) {}
}
