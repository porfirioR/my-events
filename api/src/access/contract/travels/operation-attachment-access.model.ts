export class OperationAttachmentAccessModel {
  constructor(
    public id: number,
    public operationId: number,
    public externalId: string,
    public storageUrl: string,
    public originalFilename: string,
    public uploadedByUserId: number,
    public fileSize: number | null,
    public uploadedDate: Date,
  ) {}
}