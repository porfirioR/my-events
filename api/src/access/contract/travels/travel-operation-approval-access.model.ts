export class TravelOperationApprovalAccessModel {
  constructor(
    public operationId: number,
    public memberId: number,
    public status: string,
    public id: number | null = null,
    public approvalDate: Date | null = null,
    public rejectionReason: string | null = null,
  ) {}
}