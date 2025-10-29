import { SplitType, WhoPaid } from "../../../utility/enums";
import { TransactionReimbursementModel, TransactionSplitDetailModel } from ".";

export class TransactionDetailModel {
  constructor(
    public id: number,
    public userId: number,
    public collaboratorId: number,
    public collaboratorName: string,
    public collaboratorSurname: string,
    public collaboratorEmail: string | null,
    public totalAmount: number,
    public description: string | null,
    public splitType: SplitType,
    public whoPaid: WhoPaid,
    public totalReimbursement: number,
    public netAmount: number,
    public transactionDate: Date,
    public splits: TransactionSplitDetailModel[],
    public reimbursements: TransactionReimbursementModel[],
    public isSettled: boolean,
    public createdByMe: boolean,
  ) {}
}