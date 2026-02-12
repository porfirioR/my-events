import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
  Inject,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { CurrentUserService } from '../services/current-user.service';
import { PrivateEndpointGuard } from '../guards/private-endpoint.guard';
import { TravelManagerService } from '../../manager/services/travel-manager.service';
import {
  TravelModel,
  TravelMemberModel,
  TravelOperationModel,
  PaymentMethodModel,
  CreateTravelRequest,
  UpdateTravelRequest,
  AddTravelMemberRequest,
  CreateTravelOperationRequest,
  UpdateTravelOperationRequest,
  ApproveOperationRequest,
  RejectOperationRequest,
  TravelBalanceByCurrencyModel,
  OperationAttachmentModel,
  CreateOperationAttachmentRequest,
  OperationCategoryModel,
  OperationCategorySummaryModel,
} from '../../manager/models/travels';
import {
  CreateTravelApiRequest,
  UpdateTravelApiRequest,
  AddTravelMemberApiRequest,
  CreateTravelOperationApiRequest,
  UpdateTravelOperationApiRequest,
  RejectOperationApiRequest,
} from '../models/travels';
import { MessageModel } from '../models/message.model';
import { TRAVEL_TOKENS } from '../../utility/constants/injection-tokens.const';
import { FileInterceptor } from '@nestjs/platform-express';
import { SplitType, TravelParticipantType } from 'src/utility/enums';

@Controller('travels')
@UseGuards(PrivateEndpointGuard)
export class TravelsController {
  constructor(
    private readonly currentUserService: CurrentUserService,
    @Inject(TRAVEL_TOKENS.MANAGER_SERVICE)
    private readonly travelManagerService: TravelManagerService,
  ) {}

  // ==================== PAYMENT METHODS ====================

  /**
   * Obtener todos los métodos de pago
   * GET /api/travels/payment-methods
   */
  @Get('payment-methods')
  async getAllPaymentMethods(): Promise<PaymentMethodModel[]> {
    return await this.travelManagerService.getAllPaymentMethods();
  }

  
  /**
   * Obtener todas las categorías de operaciones
   * GET /api/travels/operation-categories
   */
  @Get('operation-categories')
  async getAllOperationCategories(): Promise<OperationCategoryModel[]> {
    return await this.travelManagerService.getAllOperationCategories();
  }

  // ==================== TRAVELS ====================

  /**
   * Obtener todos los viajes del usuario
   * GET /api/travels
   */
  @Get()
  async getAllTravels(): Promise<TravelModel[]> {
    const userId = await this.currentUserService.getCurrentUserId();
    return await this.travelManagerService.getAllTravelsByUser(userId);
  }

  /**
   * Obtener viajes activos
   * GET /api/travels/active
   */
  @Get('active')
  async getActiveTravels(): Promise<TravelModel[]> {
    const userId = await this.currentUserService.getCurrentUserId();
    return await this.travelManagerService.getActiveTravels(userId);
  }

  /**
   * Obtener viajes finalizados
   * GET /api/travels/finalized
   */
  @Get('finalized')
  async getFinalizedTravels(): Promise<TravelModel[]> {
    const userId = await this.currentUserService.getCurrentUserId();
    return await this.travelManagerService.getFinalizedTravels(userId);
  }

  /**
   * Obtener viaje por ID
   * GET /api/travels/:id
   */
  @Get(':id')
  async getTravelById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TravelModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    return await this.travelManagerService.getTravelById(id, userId);
  }

  /**
   * Crear nuevo viaje
   * POST /api/travels
   */
  @Post()
  async createTravel(
    @Body() apiRequest: CreateTravelApiRequest,
  ): Promise<TravelModel> {
    const userId = await this.currentUserService.getCurrentUserId();

    const request = new CreateTravelRequest(
      userId,
      apiRequest.name,
      apiRequest.description || null,
      apiRequest.startDate ? new Date(apiRequest.startDate) : null,
      apiRequest.endDate ? new Date(apiRequest.endDate) : null,
      apiRequest.defaultCurrencyId || null,
    );

    return await this.travelManagerService.createTravel(request);
  }

  /**
   * Actualizar viaje
   * PUT /api/travels/:id
   */
  @Put(':id')
  async updateTravel(
    @Param('id', ParseIntPipe) id: number,
    @Body() apiRequest: UpdateTravelApiRequest,
  ): Promise<TravelModel> {
    const userId = await this.currentUserService.getCurrentUserId();

    const request = new UpdateTravelRequest(
      id,
      userId,
      apiRequest.name,
      apiRequest.description || null,
      apiRequest.startDate ? new Date(apiRequest.startDate) : null,
      apiRequest.endDate ? new Date(apiRequest.endDate) : null,
      apiRequest.defaultCurrencyId || null,
    );

    return await this.travelManagerService.updateTravel(request);
  }

  /**
   * Finalizar viaje
   * POST /api/travels/:id/finalize
   */
  @Post(':id/finalize')
  async finalizeTravel(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TravelModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    return await this.travelManagerService.finalizeTravel(id, userId);
  }

  /**
   * Eliminar viaje
   * DELETE /api/travels/:id
   */
  @Delete(':id')
  async deleteTravel(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MessageModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    await this.travelManagerService.deleteTravel(id, userId);
    return new MessageModel('Travel deleted successfully');
  }

  // ==================== TRAVEL MEMBERS ====================

  /**
   * Obtener miembros del viaje
   * GET /api/travels/:travelId/members
   */
  @Get(':travelId/members')
  async getTravelMembers(
    @Param('travelId', ParseIntPipe) travelId: number,
  ): Promise<TravelMemberModel[]> {
    const userId = await this.currentUserService.getCurrentUserId();
    return await this.travelManagerService.getTravelMembers(travelId, userId);
  }

  /**
   * Agregar miembro al viaje
   * POST /api/travels/:travelId/members
   */
  @Post(':travelId/members')
  async addTravelMember(
    @Param('travelId', ParseIntPipe) travelId: number,
    @Body() apiRequest: AddTravelMemberApiRequest,
  ): Promise<TravelMemberModel> {
    const userId = await this.currentUserService.getCurrentUserId();

    const request = new AddTravelMemberRequest(
      userId,
      travelId,
      apiRequest.collaboratorId,
    );

    return await this.travelManagerService.addTravelMember(request);
  }

  /**
   * Eliminar miembro del viaje
   * DELETE /api/travels/members/:memberId
   */
  @Delete('members/:memberId')
  async removeTravelMember(
    @Param('memberId', ParseIntPipe) memberId: number,
  ): Promise<MessageModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    await this.travelManagerService.removeTravelMember(memberId, userId);
    return new MessageModel('Member removed successfully');
  }

  // ==================== TRAVEL OPERATIONS ====================

  /**
   * Obtener operaciones del viaje
   * GET /api/travels/:travelId/operations
   */
  @Get(':travelId/operations')
  async getTravelOperations(
    @Param('travelId', ParseIntPipe) travelId: number,
  ): Promise<TravelOperationModel[]> {
    const userId = await this.currentUserService.getCurrentUserId();
    return await this.travelManagerService.getTravelOperations(travelId, userId);
  }

  /**
   * Obtener operación por ID
   * GET /api/travels/operations/:operationId
   */
  @Get('operations/:operationId')
  async getTravelOperationById(
    @Param('operationId', ParseIntPipe) operationId: number,
  ): Promise<TravelOperationModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    return await this.travelManagerService.getTravelOperationById(operationId, userId);
  }

  /**
   * Crear nueva operación
   * POST /api/travels/:travelId/operations
   */
  @Post(':travelId/operations')
  async createTravelOperation(
    @Param('travelId', ParseIntPipe) travelId: number,
    @Body() apiRequest: CreateTravelOperationApiRequest,
  ): Promise<TravelOperationModel> {
    const userId = await this.currentUserService.getCurrentUserId();

    // VALIDACIÓN: Si participantType es 'All', no necesita participantMemberIds
    let participantMemberIds: number[] = [];
  
    if (apiRequest.participantType === TravelParticipantType.Selected) {
      if (!apiRequest.participantMemberIds || apiRequest.participantMemberIds.length === 0) {
        throw new BadRequestException('participantMemberIds is required when participantType is Selected');
      }
      participantMemberIds = apiRequest.participantMemberIds.map(x => +x);
    }

    // ✅ VALIDACIÓN: customAmounts/customPercentages según splitType
    let customAmounts: number[] | undefined;
    let customPercentages: number[] | undefined;

    if (apiRequest.splitType === SplitType.CUSTOM) {
      if (!apiRequest.customAmounts) {
        throw new BadRequestException('customAmounts is required when splitType is Custom');
      }
      customAmounts = apiRequest.customAmounts;
    }

    if (apiRequest.splitType === SplitType.PERCENTAGE) {
      if (!apiRequest.customPercentages) {
        throw new BadRequestException('customPercentages is required when splitType is Percentage');
      }
      customPercentages = apiRequest.customPercentages;
    }
    const request = new CreateTravelOperationRequest(
      userId,
      +travelId,
      +apiRequest.currencyId,
      +apiRequest.paymentMethodId,
      +apiRequest.whoPaidMemberId,
      +apiRequest.amount,
      apiRequest.description,
      apiRequest.participantType,
      apiRequest.splitType,
      new Date(apiRequest.transactionDate),
      +apiRequest.categoryId,
      participantMemberIds,
      customAmounts,
      customPercentages,
    );

    return await this.travelManagerService.createTravelOperation(request);
  }

  /**
   * Actualizar operación
   * PUT /api/travels/:travelId/operations/:operationId
   */
  @Put(':travelId/operations/:operationId')
  async updateTravelOperation(
    @Param('travelId', ParseIntPipe) travelId: number,
    @Param('operationId', ParseIntPipe) operationId: number,
    @Body() apiRequest: UpdateTravelOperationApiRequest,
  ): Promise<TravelOperationModel> {
    const userId = await this.currentUserService.getCurrentUserId();

    // ✅ VALIDACIONES similares al create
    let customAmounts: number[] | undefined;
    let customPercentages: number[] | undefined;

    if (apiRequest.splitType === SplitType.CUSTOM) {
      if (!apiRequest.customAmounts) {
        throw new BadRequestException('customAmounts is required when splitType is Custom');
      }
      customAmounts = apiRequest.customAmounts;
    }

    if (apiRequest.splitType === SplitType.PERCENTAGE) {
      if (!apiRequest.customPercentages) {
        throw new BadRequestException('customPercentages is required when splitType is Percentage');
      }
      customPercentages = apiRequest.customPercentages;
    }

    const request = new UpdateTravelOperationRequest(
      userId,
      operationId,
      travelId,
      +apiRequest.currencyId,
      +apiRequest.paymentMethodId,
      +apiRequest.whoPaidMemberId,
      +apiRequest.amount,
      apiRequest.description,
      apiRequest.participantType,
      apiRequest.splitType,
      new Date(apiRequest.transactionDate),
      +apiRequest.categoryId,
      apiRequest.participantMemberIds.map(x => +x),
      customAmounts,
      customPercentages,
    );

    return await this.travelManagerService.updateTravelOperation(request);
  }

  /**
   * Eliminar operación
   * DELETE /api/travels/operations/:operationId
   */
  @Delete('operations/:operationId')
  async deleteTravelOperation(
    @Param('operationId', ParseIntPipe) operationId: number,
  ): Promise<MessageModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    await this.travelManagerService.deleteTravelOperation(operationId, userId);
    return new MessageModel('Operation deleted successfully');
  }

  /**
   * Salir de una operación
   * POST /api/travels/operations/:operationId/leave
   */
  @Post('operations/:operationId/leave')
  async leaveOperation(
    @Param('operationId', ParseIntPipe) operationId: number,
  ): Promise<MessageModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    const result = await this.travelManagerService.leaveOperation(operationId, userId);
    
    return new MessageModel(
      result.operationDeleted 
        ? 'You left the operation. Since no participants remain, the operation was deleted.'
        : 'You successfully left the operation. Amounts have been recalculated.'
    );
  }

  // ==================== OPERATION APPROVALS ====================

  /**
   * Aprobar operación
   * POST /api/travels/operations/:operationId/approve
   */
  @Post('operations/:operationId/approve')
  async approveOperation(
    @Param('operationId', ParseIntPipe) operationId: number,
  ): Promise<TravelOperationModel> {
    const userId = await this.currentUserService.getCurrentUserId();

    const request = new ApproveOperationRequest(userId, +operationId);

    return await this.travelManagerService.approveOperation(request);
  }

  /**
   * Rechazar operación
   * POST /api/travels/operations/:operationId/reject
   */
  @Post('operations/:operationId/reject')
  async rejectOperation(
    @Param('operationId', ParseIntPipe) operationId: number,
    @Body() apiRequest: RejectOperationApiRequest,
  ): Promise<TravelOperationModel> {
    const userId = await this.currentUserService.getCurrentUserId();

    const request = new RejectOperationRequest(
      userId,
      operationId,
      apiRequest.rejectionReason,
    );

    return await this.travelManagerService.rejectOperation(request);
  }

  // ==================== TRAVEL BALANCES ====================

  /**
   * Obtener balances del viaje por moneda
   * GET /api/travels/:travelId/balances
   */
  @Get(':travelId/balances')
  async getTravelBalances(
    @Param('travelId', ParseIntPipe) travelId: number,
  ): Promise<TravelBalanceByCurrencyModel[]> {
    const userId = await this.currentUserService.getCurrentUserId();
    return await this.travelManagerService.getTravelBalancesByCurrency(travelId, userId);
  }

  // ==================== OPERATION CATEGORIES ====================

  /**
   * Obtener resumen de categorías por viaje
   * GET /api/travels/:travelId/category-summary
   */
  @Get(':travelId/category-summary')
  async getTravelCategorySummary(
    @Param('travelId', ParseIntPipe) travelId: number,
  ): Promise<OperationCategorySummaryModel[]> {
    const userId = await this.currentUserService.getCurrentUserId();
    return await this.travelManagerService.getTravelCategorySummary(travelId, userId);
  }

  // ==================== OPERATION ATTACHMENTS ====================

  /**
   * Obtener attachments de una operación
   * GET /api/travels/operations/:operationId/attachments
   */
  @Get('operations/:operationId/attachments')
  async getOperationAttachments(
    @Param('operationId', ParseIntPipe) operationId: number,
  ): Promise<OperationAttachmentModel[]> {
    const userId = await this.currentUserService.getCurrentUserId();
    return await this.travelManagerService.getOperationAttachments(operationId, userId);
  }

  /**
   * Subir attachment a una operación
   * POST /api/travels/operations/:operationId/attachments
   */
  @Post('operations/:operationId/attachments')
  @UseInterceptors(FileInterceptor('file'))
  async createOperationAttachment(
    @Param('operationId', ParseIntPipe) operationId: number,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<OperationAttachmentModel> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const userId = await this.currentUserService.getCurrentUserId();

    const request = new CreateOperationAttachmentRequest(
      +operationId,
      file,
      userId,
    );

    return await this.travelManagerService.createOperationAttachment(request);
  }

  /**
   * Eliminar attachment
   * DELETE /api/travels/attachments/:attachmentId
   */
  @Delete('attachments/:attachmentId')
  async deleteOperationAttachment(
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
  ): Promise<MessageModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    await this.travelManagerService.deleteOperationAttachment(attachmentId, userId);
    return new MessageModel('Attachment deleted successfully');
  }
}