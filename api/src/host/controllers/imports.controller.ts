import { BadRequestException, Controller, HttpCode, Inject, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PrivateEndpointGuard } from '../guards/private-endpoint.guard';
import { ImportManagerService } from '../../manager/services/import-manager.service';
import { MyMoneyPreviewModel } from '../../manager/models/imports/mymoney-preview.model';
import { IMPORT_TOKENS } from '../../utility/constants/injection-tokens.const';

// Un export de 2 años de MyMoney pesa menos de 1 MB; 10 MB deja margen sin aceptar cualquier cosa
const MAX_EXPORT_SIZE = 10 * 1024 * 1024;

@Controller('imports')
@UseGuards(PrivateEndpointGuard)
export class ImportsController {
  constructor(
    @Inject(IMPORT_TOKENS.MANAGER_SERVICE)
    private readonly importManagerService: ImportManagerService,
  ) {}

  // Lee el export de MyMoney y devuelve el resumen por mes, sin guardar nada (#230).
  // Un archivo inválido responde 200 con valid = false y la lista de errores, para mostrarlos en la pantalla.
  @Post('mymoney/preview')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_EXPORT_SIZE } }))
  previewMyMoney(@UploadedFile() file?: Express.Multer.File): MyMoneyPreviewModel {
    if (!file?.buffer?.length) {
      throw new BadRequestException('File is required');
    }
    return this.importManagerService.previewMyMoney(file.originalname, file.buffer);
  }
}
