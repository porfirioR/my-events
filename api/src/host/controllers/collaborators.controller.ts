import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { CollaboratorManagerService } from '../../manager/services';
import { CurrentUserService } from '../services/current-user.service';
import { PrivateEndpointGuard } from '../guards/private-endpoint.guard';
import { CollaboratorModel, CreateCollaboratorRequest, UpdateCollaboratorRequest } from '../../manager/models/collaborators';
import { CreateCollaboratorApiRequest } from '../models/collaborators/create-collaborator-api-request';
import { UpdateCollaboratorApiRequest } from '../models/collaborators/update-collaborator-api-request';

@Controller('collaborators')
@UseGuards(PrivateEndpointGuard)
export class CollaboratorsController {
  constructor(
    private readonly currentUserService: CurrentUserService,
    private collaboratorManagerService: CollaboratorManagerService
  ) {}

  // Obtener todos los colaboradores del usuario
  @Get('my-collaborators')
  async getMyCollaborators(): Promise<CollaboratorModel[]> {
    const userId = await this.currentUserService.getCurrentUserId()
    return await this.collaboratorManagerService.getMyCollaborators(userId);
  }

  // Obtener colaboradores internos
  @Get('internal')
  async getInternalCollaborators(): Promise<CollaboratorModel[]> {
    const userId = await this.currentUserService.getCurrentUserId()
    return await this.collaboratorManagerService.getInternalCollaborators(userId);
  }

  // Obtener colaboradores externos
  @Get('external')
  async getExternalCollaborators(): Promise<CollaboratorModel[]> {
    const userId = await this.currentUserService.getCurrentUserId()
    return await this.collaboratorManagerService.getExternalCollaborators(userId);
  }

  // Obtener un colaborador específico
  @Get(':id')
  async getMyCollaborator(
    @Param('id', ParseIntPipe) id: number,
    
  ): Promise<CollaboratorModel> {
    const userId = await this.currentUserService.getCurrentUserId()
    return await this.collaboratorManagerService.getMyCollaborator(id, userId);
  }

  // Obtener estadísticas
  @Get('stats')
  async getCollaboratorStats() {
    const userId = await this.currentUserService.getCurrentUserId()
    return await this.collaboratorManagerService.getCollaboratorStats(userId);
  }

  // Verificar si se puede eliminar
  @Get('can-delete/:id')
  async canDeleteCollaborator(@Param('id', ParseIntPipe) id: number) {
    return await this.collaboratorManagerService.canDeleteCollaborator(id);
  }

  // Create colaborador
  @Post()
  async createCollaborator(@Body() apiRequest: CreateCollaboratorApiRequest): Promise<CollaboratorModel> {
    const request = new CreateCollaboratorRequest(
      apiRequest.name,
      apiRequest.surname,
      apiRequest.email || null,
      apiRequest.userId
    );
    return await this.collaboratorManagerService.createCollaborator(request);
  }

  // Actualizar colaborador
  @Put()
  async updateCollaborator(@Body() apiRequest: UpdateCollaboratorApiRequest): Promise<CollaboratorModel> {
    const userId = await this.currentUserService.getCurrentUserId()
    const request = new UpdateCollaboratorRequest(
      apiRequest.id,
      apiRequest.name,
      apiRequest.surname,
      apiRequest.email || null,
      userId
    );
    return await this.collaboratorManagerService.updateCollaborator(request);
  }

  // Desactivar colaborador (soft delete)
  @Delete(':id')
  async deactivateCollaborator(@Param('id', ParseIntPipe) id: number, ): Promise<CollaboratorModel> {
    const userId = await this.currentUserService.getCurrentUserId()
    return await this.collaboratorManagerService.deactivateCollaborator(id, userId);
  }
}