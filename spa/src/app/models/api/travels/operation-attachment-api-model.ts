export interface OperationAttachmentApiModel {
  id: number;
  operationId: number;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  uploadedByUserId: number;
  uploadedDate: Date;
  uploaderName?: string;
}