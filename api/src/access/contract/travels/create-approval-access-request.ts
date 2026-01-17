export class CreateApprovalAccessRequest {
  constructor(
    public operationId: number,
    public memberId: number,
    public status: string, // 'Pending' or 'Approved' (auto-approved for creator)
  ) {}
}