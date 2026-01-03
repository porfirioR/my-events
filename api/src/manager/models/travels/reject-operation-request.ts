export class RejectOperationRequest {
  constructor(
    public userId: number,
    public operationId: number,
    public rejectionReason: string,
  ) {}
}