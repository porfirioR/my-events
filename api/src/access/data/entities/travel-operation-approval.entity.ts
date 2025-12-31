export class TravelOperationApprovalEntity {
  public id?: number;

  constructor(
    public operationid: number,
    public memberid: number,
    public status: string,
    public approvaldate?: Date | null,
    public rejectionreason?: string | null,
  ) {}
}