import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { CollaboratorManagerService } from '../../manager/services';
import { PrivateEndpointGuard } from '../guards/private-endpoint.guard';
import { CollaboratorModel, CreateCollaboratorRequest, UpdateCollaboratorRequest } from '../../manager/models/collaborators';
import { CreateCollaboratorApiRequest } from '../models/collaborators/create-collaborator-api-request';
import { UpdateCollaboratorApiRequest } from '../models/collaborators/update-collaborator-api-request';

// import { PrivateEndpointGuard } from '../guards/private-endpoint.guard';

@Controller('collaborators')
@UseGuards(PrivateEndpointGuard)
export class CollaboratorsController {
  constructor(private collaboratorManagerService: CollaboratorManagerService) {}

  // Obtener todos los colaboradores del usuario
  @Get('my-collaborators/:createdByUserId')
  async getMyCollaborators(@Param('createdByUserId', ParseIntPipe) createdByUserId: number): Promise<CollaboratorModel[]> {
    return await this.collaboratorManagerService.getMyCollaborators(createdByUserId);
  }

  // Obtener colaboradores internos
  @Get('internal/:createdByUserId')
  async getInternalCollaborators(@Param('createdByUserId', ParseIntPipe) createdByUserId: number): Promise<CollaboratorModel[]> {
    return await this.collaboratorManagerService.getInternalCollaborators(createdByUserId);
  }

  // Obtener colaboradores externos
  @Get('external/:createdByUserId')
  async getExternalCollaborators(@Param('createdByUserId', ParseIntPipe) createdByUserId: number): Promise<CollaboratorModel[]> {
    return await this.collaboratorManagerService.getExternalCollaborators(createdByUserId);
  }

  // Obtener un colaborador específico
  @Get(':id/:createdByUserId')
  async getMyCollaborator(
    @Param('id', ParseIntPipe) id: number,
    @Param('createdByUserId', ParseIntPipe) createdByUserId: number
  ): Promise<CollaboratorModel> {
    return await this.collaboratorManagerService.getMyCollaborator(id, createdByUserId);
  }

  // Obtener estadísticas
  @Get('stats/:createdByUserId')
  async getCollaboratorStats(@Param('createdByUserId', ParseIntPipe) createdByUserId: number) {
    return await this.collaboratorManagerService.getCollaboratorStats(createdByUserId);
  }

  // Verificar si se puede eliminar
  @Get('can-delete/:id')
  async canDeleteCollaborator(@Param('id', ParseIntPipe) id: number) {
    return await this.collaboratorManagerService.canDeleteCollaborator(id);
  }

  // Crear colaborador
  @Post()
  async createCollaborator(@Body() apiRequest: CreateCollaboratorApiRequest): Promise<CollaboratorModel> {
    const request = new CreateCollaboratorRequest(
      apiRequest.name,
      apiRequest.surname,
      apiRequest.email || null,
      apiRequest.createdByUserId
    );
    return await this.collaboratorManagerService.createCollaborator(request);
  }

  // Actualizar colaborador
  @Put()
  async updateCollaborator(@Body() apiRequest: UpdateCollaboratorApiRequest): Promise<CollaboratorModel> {
    const request = new UpdateCollaboratorRequest(
      apiRequest.id,
      apiRequest.name,
      apiRequest.surname,
      apiRequest.email || null,
      // Nota: createdByUserId se obtiene del colaborador existente en el access service
      0 // Se sobrescribe en el access service
    );
    return await this.collaboratorManagerService.updateCollaborator(request);
  }

  // Desactivar colaborador (soft delete)
  @Delete(':id/:createdByUserId')
  async deactivateCollaborator(
    @Param('id', ParseIntPipe) id: number,
    @Param('createdByUserId', ParseIntPipe) createdByUserId: number
  ): Promise<CollaboratorModel> {
    return await this.collaboratorManagerService.deactivateCollaborator(id, createdByUserId);
  }
}