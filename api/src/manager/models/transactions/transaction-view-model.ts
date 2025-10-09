import { WhoPaid } from "../../../utility/enums";
import { CollaboratorSummaryModel } from "../collaborators";

export class TransactionViewModel {
  constructor(
    public id: number,
    public description: string | null,
    public totalAmount: number,
    public netAmount: number,
    public myCollaborator: CollaboratorSummaryModel,
    public whoPaid: WhoPaid,
    public iPaid: number,
    public iOwe: number,
    public theyOwe: number,
    public theyPaid: number,
    public transactionDate: Date,
    public isSettled: boolean,
    public createdByMe: boolean,
  ) {}
}