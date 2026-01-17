import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Body, 
  Param, 
  UseGuards, 
  ParseIntPipe 
} from '@nestjs/common';
import { CollaboratorManagerService } from '../../manager/services';
import { CurrentUserService } from '../services/current-user.service';
import { PrivateEndpointGuard } from '../guards/private-endpoint.guard';
import { 
  CollaboratorModel, 
  EnrichedCollaboratorModel,
  CreateCollaboratorRequest, 
  UpdateCollaboratorRequest,
  ReceivedMatchRequestModel
} from '../../manager/models/collaborators';
import { CreateCollaboratorApiRequest } from '../models/collaborators/create-collaborator-api-request';
import { UpdateCollaboratorApiRequest } from '../models/collaborators/update-collaborator-api-request';
import { MessageModel } from '../models/message.model';

@Controller('collaborators')
@UseGuards(PrivateEndpointGuard)
export class CollaboratorsController {
  constructor(
    private readonly currentUserService: CurrentUserService,
    private collaboratorManagerService: CollaboratorManagerService
  ) {}

  @Get()
  async getAll(): Promise<CollaboratorModel[]> {
    const userId = await this.currentUserService.getCurrentUserId();
    return await this.collaboratorManagerService.getAll(userId);
  }

  @Get('enriched')
  async getAllEnriched(): Promise<EnrichedCollaboratorModel[]> {
    const userId = await this.currentUserService.getCurrentUserId();
    return await this.collaboratorManagerService.getAllEnriched(userId);
  }

  @Get('unlinked')
  async getUnlinkedCollaborators(): Promise<CollaboratorModel[]> {
    const userId = await this.currentUserService.getCurrentUserId();
    return await this.collaboratorManagerService.getUnlinkedCollaborators(userId);
  }

  @Get('linked')
  async getLinkedCollaborators(): Promise<CollaboratorModel[]> {
    const userId = await this.currentUserService.getCurrentUserId();
    return await this.collaboratorManagerService.getLinkedCollaborators(userId);
  }

  @Get('linked/enriched')
  async getLinkedCollaboratorsEnriched(): Promise<EnrichedCollaboratorModel[]> {
    const userId = await this.currentUserService.getCurrentUserId();
    return await this.collaboratorManagerService.getLinkedCollaboratorsEnriched(userId);
  }

  @Get('stats')
  async getCollaboratorStats() {
    const userId = await this.currentUserService.getCurrentUserId();
    return await this.collaboratorManagerService.getCollaboratorStats(userId);
  }

  @Get('can-delete/:id')
  async canDeleteCollaborator(@Param('id', ParseIntPipe) id: number): Promise<{ canDelete: boolean; reason?: string; }> {
    return await this.collaboratorManagerService.canDeleteCollaborator(id);
  }

  @Get(':id')
  async getCollaboratorById(@Param('id', ParseIntPipe) id: number): Promise<CollaboratorModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    return await this.collaboratorManagerService.getById(id, userId);
  }

  @Get(':id/enriched')
  async getCollaboratorByIdEnriched(@Param('id', ParseIntPipe) id: number): Promise<EnrichedCollaboratorModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    return await this.collaboratorManagerService.getByIdEnriched(id, userId);
  }

  @Post()
  async createCollaborator(@Body() apiRequest: CreateCollaboratorApiRequest): Promise<CollaboratorModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    const request = new CreateCollaboratorRequest(
      apiRequest.name,
      apiRequest.surname,
      userId
    );
    return await this.collaboratorManagerService.createCollaborator(request);
  }

  @Put()
  async updateCollaborator(@Body() apiRequest: UpdateCollaboratorApiRequest): Promise<CollaboratorModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    const request = new UpdateCollaboratorRequest(
      apiRequest.id,
      apiRequest.name,
      apiRequest.surname,
      userId
    );
    return await this.collaboratorManagerService.updateCollaborator(request);
  }

  @Put('change-visibility/:id')
  async changeVisibility(@Param('id', ParseIntPipe) id: number): Promise<CollaboratorModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    return await this.collaboratorManagerService.changeVisibility(id, userId);
  }

  @Post(':id/resend-invitation')
  async resendInvitation(@Param('id', ParseIntPipe) id: number): Promise<MessageModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    await this.collaboratorManagerService.resendInvitation(userId, id);
    return new MessageModel('matchRequests.invitationResent');
  }

  /**
   * Obtener notificaciones al hacer login
   * GET /api/collaborators/notifications/login
   */
  @Get('notifications/login')
  async getLoginNotifications(): Promise<{ pendingMatchRequests: number; matchRequests: ReceivedMatchRequestModel[];}> {
    const userId = await this.currentUserService.getCurrentUserId();
    const userEmail = await this.currentUserService.getCurrentUserEmail();
    return await this.collaboratorManagerService.getLoginNotifications(userId, userEmail);
  }
}