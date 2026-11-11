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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PrivateEndpointGuard } from '../guards/private-endpoint.guard';
import { CurrentUserService } from '../services/current-user.service';
import { ImportManagerService } from '../../manager/services/import-manager.service';
import {
  MyMoneyCategoryMappingModel,
  MyMoneyCategorySyncModel,
  MyMoneyDescriptionRuleModel,
  MyMoneyPreviewModel,
  UpdateMyMoneyCategoryMappingRequest,
  UpsertMyMoneyDescriptionRuleRequest,
} from '../../manager/models/imports';
import { UpdateMyMoneyCategoryMappingApiRequest, UpsertMyMoneyDescriptionRuleApiRequest } from '../models/imports';
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
