export class CreateOperationAttachmentAccessRequest {
  constructor(
    public operationId: number,
    public externalId: string,
    public storageUrl: string,
    public originalFilename: string,
    public uploadedByUserId: number,
    public fileSize?: number,
  ) {}
}