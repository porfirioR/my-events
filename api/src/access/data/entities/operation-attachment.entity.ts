export class OperationAttachmentEntity {
  public id: number;

  constructor(
    public operationid: number,
    public externalid: string,
    public storageurl: string,
    public originalfilename: string,
    public uploadedbyuserid: number,
    public filesize?: number,
    public uploadeddate?: Date
  ) {}
}