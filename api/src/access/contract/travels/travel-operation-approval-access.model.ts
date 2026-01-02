export class TravelOperationApprovalAccessModel {
  constructor(
    public id: number,
    public operationId: number,
    public memberId: number,
    public status: string,
    public approvalDate: Date | null,
    public rejectionReason: string | null,
  ) {}
}