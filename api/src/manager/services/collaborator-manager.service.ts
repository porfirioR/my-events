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
  public getAll = async (userId: number): Promise<CollaboratorModel[]> => {
    const accessModelList = await this.collaboratorAccessService.getAll(userId);
    return accessModelList.map(this.getModel);
  };

  // Obtener colaboradores internos
  public getInternalCollaborators = async (userId: number): Promise<CollaboratorModel[]> => {
    const accessModelList = await this.collaboratorAccessService.getInternalCollaborators(userId);
    return accessModelList.map(this.getModel);
  };

  // Obtener colaboradores externos
  public getExternalCollaborators = async (userId: number): Promise<CollaboratorModel[]> => {
    const accessModelList = await this.collaboratorAccessService.getExternalCollaborators(userId);
    return accessModelList.map(this.getModel);
  };

  // Obtener un colaborador específico
  public getById = async (id: number, userId: number): Promise<CollaboratorModel> => {
    const accessModel = await this.collaboratorAccessService.getById(id, userId);
    return this.getModel(accessModel);
  };

  // Crear colaborador
  public createCollaborator = async (request: CreateCollaboratorRequest): Promise<CollaboratorModel> => {
    const accessRequest = new CreateCollaboratorAccessRequest(
      request.name,
      request.surname,
      request.email,
      request.userId
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
      request.userId
    );

    const accessModel = await this.collaboratorAccessService.updateCollaborator(accessRequest);
    return this.getModel(accessModel);
  };

  // Desactivar/Activar colaborador
  public changeVisibility = async (id: number, userId: number): Promise<CollaboratorModel> => {
    const accessModel = await this.collaboratorAccessService.changeVisibility(id, userId);
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
  public getCollaboratorStats = async (userId: number) => {
    return await this.collaboratorAccessService.getCollaboratorStats(userId);
  };

  // Mapper privado
  private getModel = (accessModel: CollaboratorAccessModel): CollaboratorModel => {
    return new CollaboratorModel(
      accessModel.id,
      accessModel.name,
      accessModel.surname,
      accessModel.email,
      accessModel.userId,
      accessModel.isActive,
      accessModel.dateCreated,
      accessModel.type
    );
  };
}