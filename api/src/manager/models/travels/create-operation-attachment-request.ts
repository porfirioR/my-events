export class CreateOperationAttachmentRequest {
  constructor(
    public operationId: number,
    public file: Express.Multer.File, // File from upload
    public userId: number, // Who uploads
  ) {}
}