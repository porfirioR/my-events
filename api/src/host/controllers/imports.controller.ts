import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PrivateEndpointGuard } from '../guards/private-endpoint.guard';
import { CurrentUserService } from '../services/current-user.service';
import { ImportManagerService } from '../../manager/services/import-manager.service';
import { MyMoneyReconciliationManagerService } from '../../manager/services/mymoney-reconciliation-manager.service';
import {
  MyMoneyReconciliationApplyResultModel,
  MyMoneyReconciliationModel,
  MyMoneyCategoryMappingModel,
  MyMoneyCategorySyncModel,
  MyMoneyDescriptionRuleModel,
  MyMoneyImportResultModel,
  MyMoneyPreviewModel,
  UpdateMyMoneyCategoryMappingRequest,
  UpsertMyMoneyDescriptionRuleRequest,
} from '../../manager/models/imports';
import {
  ApplyMyMoneyReconciliationApiRequest,
  UpdateMyMoneyCategoryMappingApiRequest,
  UpsertMyMoneyDescriptionRuleApiRequest,
} from '../models/imports';
import { MessageModel } from '../models/message.model';
import { IMPORT_TOKENS } from '../../utility/constants/injection-tokens.const';

// Un export de 2 años de MyMoney pesa menos de 1 MB; 10 MB deja margen sin aceptar cualquier cosa
const MAX_EXPORT_SIZE = 10 * 1024 * 1024;

@Controller('imports')
@UseGuards(PrivateEndpointGuard)
export class ImportsController {
  constructor(
    private readonly currentUserService: CurrentUserService,
    @Inject(IMPORT_TOKENS.MANAGER_SERVICE)
    private readonly importManagerService: ImportManagerService,
    @Inject(IMPORT_TOKENS.RECONCILIATION_MANAGER_SERVICE)
    private readonly reconciliationManagerService: MyMoneyReconciliationManagerService,
  ) {}

  // Lee el export de MyMoney y devuelve el resumen por mes, sin guardar nada (#230).
  // Un archivo inválido responde 200 con valid = false y la lista de errores, para mostrarlos en la pantalla.
  @Post('mymoney/preview')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_EXPORT_SIZE } }))
  previewMyMoney(@UploadedFile() file?: Express.Multer.File): MyMoneyPreviewModel {
    const upload = this.requireFile(file);
    return this.importManagerService.previewMyMoney(upload.originalname, upload.buffer);
  }

  // Guarda los movimientos del rango del archivo sin duplicar (#232). Igual que preview, un archivo
  // inválido responde 200 con valid = false y no guarda nada.
  @Post('mymoney')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_EXPORT_SIZE } }))
  async importMyMoney(@UploadedFile() file?: Express.Multer.File): Promise<MyMoneyImportResultModel> {
    const upload = this.requireFile(file);
    const userId = await this.currentUserService.getCurrentUserId();
    return this.importManagerService.importMyMoney(userId, upload.originalname, upload.buffer);
  }

  // ==================== CONCILIACIÓN (#233) ====================

  // Transferencias del mes a ahorros y préstamos con la cuota que pagan, y diferencias en los dos sentidos
  @Get('mymoney/reconciliation')
  async getReconciliation(@Query('month') month: string): Promise<MyMoneyReconciliationModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    return this.reconciliationManagerService.getReconciliation(userId, month ?? '');
  }

  @Post('mymoney/reconciliation')
  @HttpCode(200)
  async applyReconciliation(@Body() apiRequest: ApplyMyMoneyReconciliationApiRequest): Promise<MyMoneyReconciliationApplyResultModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    return this.reconciliationManagerService.apply(userId, apiRequest.month, apiRequest.items.map(item => ({
      importedMovementId: item.importedMovementId,
      installmentIds: item.installmentIds,
      markAsPaid: item.markAsPaid,
    })));
  }

  @Delete('mymoney/reconciliation/:importedMovementId')
  async unreconcile(@Param('importedMovementId', ParseIntPipe) importedMovementId: number): Promise<MessageModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    await this.reconciliationManagerService.unreconcile(userId, importedMovementId);
    return new MessageModel('Reconciliation removed successfully');
  }

  // ==================== MAPEO DE CATEGORÍAS (#231) ====================

  @Get('mymoney/category-mappings')
  async getCategoryMappings(): Promise<MyMoneyCategoryMappingModel[]> {
    const userId = await this.currentUserService.getCurrentUserId();
    return this.importManagerService.getCategoryMappings(userId);
  }

  // Toma las categorías de un export: agrega las nuevas con su clasificación por defecto y actualiza
  // los nombres. Igual que preview, un archivo inválido responde 200 con valid = false.
  @Post('mymoney/category-mappings/sync')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_EXPORT_SIZE } }))
  async syncCategoryMappings(@UploadedFile() file?: Express.Multer.File): Promise<MyMoneyCategorySyncModel> {
    const upload = this.requireFile(file);
    const userId = await this.currentUserService.getCurrentUserId();
    return this.importManagerService.syncCategoryMappings(userId, upload.originalname, upload.buffer);
  }

  @Put('mymoney/category-mappings/:id')
  async updateCategoryMapping(
    @Param('id', ParseIntPipe) id: number,
    @Body() apiRequest: UpdateMyMoneyCategoryMappingApiRequest,
  ): Promise<MyMoneyCategoryMappingModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    return this.importManagerService.updateCategoryMapping(new UpdateMyMoneyCategoryMappingRequest(
      id,
      userId,
      +apiRequest.kind,
      apiRequest.isEssential,
      apiRequest.isExtraordinary,
      apiRequest.accountId ?? null,
      apiRequest.savingsGoalId ?? null,
      apiRequest.loanId ?? null,
    ));
  }

  // ==================== MAPEO POR DESCRIPCIÓN (#231) ====================

  @Get('mymoney/description-rules')
  async getDescriptionRules(): Promise<MyMoneyDescriptionRuleModel[]> {
    const userId = await this.currentUserService.getCurrentUserId();
    return this.importManagerService.getDescriptionRules(userId);
  }

  @Post('mymoney/description-rules')
  async createDescriptionRule(@Body() apiRequest: UpsertMyMoneyDescriptionRuleApiRequest): Promise<MyMoneyDescriptionRuleModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    return this.importManagerService.upsertDescriptionRule(this.mapRuleRequest(null, userId, apiRequest));
  }

  @Put('mymoney/description-rules/:id')
  async updateDescriptionRule(
    @Param('id', ParseIntPipe) id: number,
    @Body() apiRequest: UpsertMyMoneyDescriptionRuleApiRequest,
  ): Promise<MyMoneyDescriptionRuleModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    return this.importManagerService.upsertDescriptionRule(this.mapRuleRequest(id, userId, apiRequest));
  }

  @Delete('mymoney/description-rules/:id')
  async deleteDescriptionRule(@Param('id', ParseIntPipe) id: number): Promise<MessageModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    await this.importManagerService.deleteDescriptionRule(id, userId);
    return new MessageModel('Description rule deleted successfully');
  }

  private requireFile = (file?: Express.Multer.File): Express.Multer.File => {
    if (!file?.buffer?.length) {
      throw new BadRequestException('File is required');
    }
    return file;
  };

  private mapRuleRequest = (
    id: number | null,
    userId: number,
    apiRequest: UpsertMyMoneyDescriptionRuleApiRequest,
  ): UpsertMyMoneyDescriptionRuleRequest =>
    new UpsertMyMoneyDescriptionRuleRequest(
      id,
      userId,
      apiRequest.pattern,
      apiRequest.accountId ?? null,
      apiRequest.savingsGoalId ?? null,
      apiRequest.loanId ?? null,
    );
}
