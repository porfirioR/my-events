export class OperationAttachmentModel {
  constructor(
    public id: number,
    public operationId: number,
    public fileName: string, // Derived from originalFilename
    public fileUrl: string, // storageUrl
    public fileSize: number | null,
    public uploadedByUserId: number,
    public uploadedDate: Date,
    public uploaderName?: string, // Enriched data
  ) {}
}