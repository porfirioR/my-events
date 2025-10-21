export class TransactionMatchInfoModel {
  constructor(
    public myCollaboratorId: number,
    public theirCollaboratorId: number,
    public otherUserId: number,
  ) {}
}
