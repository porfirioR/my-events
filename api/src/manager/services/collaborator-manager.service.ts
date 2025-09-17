import { Inject, Injectable } from '@nestjs/common';
import { CollaboratorModel, CreateCollaboratorRequest, UpdateCollaboratorRequest } from '../models/collaborators';
import { CollaboratorAccessModel, CreateCollaboratorAccessRequest, ICollaboratorAccessService, UpdateCollaboratorAccessRequest } from '../../access/contract/collaborators';
import { COLLABORATOR_TOKENS } from '../../utility/constants';


@Injectable()
export class CollaboratorManagerService {
  constructor(
    @Inject(COLLABORATOR_TOKENS.ACCESS_SERVICE)
    private collaboratorAccessService: ICollaboratorAccessService
  ) {}

  // Obtener todos los colaboradores del usuario
  public getMyCollaborators = async (createdByUserId: number): Promise<CollaboratorModel[]> => {
    const accessModelList = await this.collaboratorAccessService.getMyCollaborators(createdByUserId);
    return accessModelList.map(this.getModel);
  };

  // Obtener colaboradores internos
  public getInternalCollaborators = async (createdByUserId: number): Promise<CollaboratorModel[]> => {
    const accessModelList = await this.collaboratorAccessService.getInternalCollaborators(createdByUserId);
    return accessModelList.map(this.getModel);
  };

  // Obtener colaboradores externos
  public getExternalCollaborators = async (createdByUserId: number): Promise<CollaboratorModel[]> => {
    const accessModelList = await this.collaboratorAccessService.getExternalCollaborators(createdByUserId);
    return accessModelList.map(this.getModel);
  };

  // Obtener un colaborador específico
  public getMyCollaborator = async (id: number, createdByUserId: number): Promise<CollaboratorModel> => {
    const accessModel = await this.collaboratorAccessService.getCollaboratorById(id, createdByUserId);
    return this.getModel(accessModel);
  };

  // Crear colaborador
  public createCollaborator = async (request: CreateCollaboratorRequest): Promise<CollaboratorModel> => {
    const accessRequest = new CreateCollaboratorAccessRequest(
      request.name,
      request.surname,
      request.email,
      request.createdByUserId
    );

    const accessModel = await this.collaboratorAccessService.createCollaborator(accessRequest);
    return this.getModel(accessModel);
  };

  // Actualizar colaborador
  public updateCollaborator = async (request: UpdateCollaboratorRequest): Promise<CollaboratorModel> => {
    const accessRequest = new UpdateCollaboratorAccessRequest(
      request.id,
      request.name,
      request.surname,
      request.email,
      request.createdByUserId
    );

    const accessModel = await this.collaboratorAccessService.updateCollaborator(accessRequest);
    return this.getModel(accessModel);
  };

  // Desactivar colaborador
  public deactivateCollaborator = async (id: number, createdByUserId: number): Promise<CollaboratorModel> => {
    const accessModel = await this.collaboratorAccessService.deactivateCollaborator(id, createdByUserId);
    return this.getModel(accessModel);
  };

  // Verificar si se puede eliminar
  public canDeleteCollaborator = async (collaboratorId: number): Promise<{ canDelete: boolean; reason?: string }> => {
    const canDelete = await this.collaboratorAccessService.canDeleteCollaborator(collaboratorId);
    
    return {
      canDelete,
      reason: canDelete ? undefined : 'El colaborador está asociado a transacciones existentes y no puede ser eliminado. Puede desactivarlo en su lugar.'
    };
  };

  // Obtener estadísticas
  public getCollaboratorStats = async (createdByUserId: number) => {
    return await this.collaboratorAccessService.getCollaboratorStats(createdByUserId);
  };

  // Mapper privado
  private getModel = (accessModel: CollaboratorAccessModel): CollaboratorModel => {
    return new CollaboratorModel(
      accessModel.id,
      accessModel.name,
      accessModel.surname,
      accessModel.email,
      accessModel.createdByUserId,
      accessModel.isActive,
      accessModel.createdDate,
      accessModel.type
    );
  };
}