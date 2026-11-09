import { Injectable } from '@nestjs/common';
import { MyMoneyExportHelper } from '../../utility/helpers/mymoney-export.helper';
import { MyMoneyPreviewModel } from '../models/imports/mymoney-preview.model';

// Importación de movimientos desde MyMoney (epic #213). Por ahora solo lee y resume el archivo (#230);
// el mapeo de categorías (#231) y el guardado idempotente (#232) se agregan después.
@Injectable()
export class ImportManagerService {
  previewMyMoney(fileName: string, content: Buffer): MyMoneyPreviewModel {
    const result = MyMoneyExportHelper.parseText(content.toString('utf8'));
    return new MyMoneyPreviewModel(
      fileName,
      result.valid,
      result.errors,
      result.warnings,
      result.valid ? MyMoneyExportHelper.summarize(result.data) : null,
    );
  }
}
