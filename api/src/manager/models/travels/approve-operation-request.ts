export class ApproveOperationRequest {
  constructor(
    public userId: number,
    public operationId: number,
  ) {}
}