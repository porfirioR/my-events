import { IsNotEmpty, IsNumber } from 'class-validator';

export class CreateOperationAttachmentApiRequest {
  @IsNumber()
  @IsNotEmpty()
  operationId: number;

  // Note: file will come from @UseInterceptors(FileInterceptor('file'))
}