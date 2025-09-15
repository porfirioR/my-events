import { Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { DbContextService } from './db-context.service';
import { CollaboratorEntity } from '../contract/entities/collaborator.entity';
import { CollaboratorAccessModel } from '../contract/collaborators/collaborator-access.model';
import { CreateCollaboratorAccessRequest } from '../contract/collaborators/create-collaborator-access-request';
import { UpdateCollaboratorAccessRequest } from '../contract/collaborators/update-collaborator-access-request';
import { TableEnum, DatabaseColumns } from '../../utility/enums';


@Injectable()
export class CollaboratorAccessService {
  private collaboratorContext: SupabaseClient<any, 'public', any>;

  constructor(private dbContextService: DbContextService) {
    this.collaboratorContext = this.dbContextService.getConnection();
  }

  // Obtener todos los colaboradores activos de un usuario
  public getMyCollaborators = async (createdByUserId: number): Promise<CollaboratorAccessModel[]> => {
    const { data, error } = await this.collaboratorContext
      .from(TableEnum.Collaborators)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.CreatedByUserId, createdByUserId)
      .eq(DatabaseColumns.IsActive, true)
      .order(DatabaseColumns.Name, { ascending: true });

    if (error) throw new Error(error.message);
    return data?.map(this.getCollaboratorAccessModel) || [];
  };

  // Obtener colaboradores internos (sin email)
  public getInternalCollaborators = async (createdByUserId: number): Promise<CollaboratorAccessModel[]> => {
    const { data, error } = await this.collaboratorContext
      .from(TableEnum.Collaborators)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.CreatedByUserId, createdByUserId)
      .eq(DatabaseColumns.IsActive, true)
      .is(DatabaseColumns.Email, null)
      .order(DatabaseColumns.Name, { ascending: true });

    if (error) throw new Error(error.message);
    return data?.map(this.getCollaboratorAccessModel) || [];
  };

  // Obtener colaboradores externos (con email)
  public getExternalCollaborators = async (createdByUserId: number): Promise<CollaboratorAccessModel[]> => {
    const { data, error } = await this.collaboratorContext
      .from(TableEnum.Collaborators)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.CreatedByUserId, createdByUserId)
      .eq(DatabaseColumns.IsActive, true)
      .not(DatabaseColumns.Email, 'is', null)
      .order(DatabaseColumns.Name, { ascending: true });

    if (error) throw new Error(error.message);
    return data?.map(this.getCollaboratorAccessModel) || [];
  };

  // Obtener un colaborador específico
  public getMyCollaborator = async (id: number, createdByUserId: number): Promise<CollaboratorAccessModel> => {
    const { data, error } = await this.collaboratorContext
      .from(TableEnum.Collaborators)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.EntityId, id)
      .eq(DatabaseColumns.CreatedByUserId, createdByUserId)
      .single();

    if (error) throw new Error(error.message);
    return this.getCollaboratorAccessModel(data);
  };

  // Crear colaborador
  public createCollaborator = async (accessRequest: CreateCollaboratorAccessRequest): Promise<CollaboratorAccessModel> => {
    const collaboratorEntity = this.getEntity(accessRequest);
    
    const { data, error } = await this.collaboratorContext
      .from(TableEnum.Collaborators)
      .insert(collaboratorEntity)
      .select()
      .single<CollaboratorEntity>();

    if (error) throw new Error(error.message);
    return this.getCollaboratorAccessModel(data);
  };

  // Actualizar colaborador
  public updateCollaborator = async (accessRequest: UpdateCollaboratorAccessRequest): Promise<CollaboratorAccessModel> => {
    // Verificar que el colaborador pertenece al usuario
    const existingCollaborator = await this.getMyCollaborator(accessRequest.id, accessRequest.createdByUserId);
    
    const collaboratorEntity = this.getEntity(accessRequest);
    collaboratorEntity.id = accessRequest.id;
    collaboratorEntity.createdbyuserid = existingCollaborator.createdByUserId;
    collaboratorEntity.createddate = existingCollaborator.createdDate;

    const { data, error } = await this.collaboratorContext
      .from(TableEnum.Collaborators)
      .upsert(collaboratorEntity)
      .select()
      .single<CollaboratorEntity>();

    if (error) throw new Error(error.message);
    return this.getCollaboratorAccessModel(data);
  };

  // Desactivar colaborador (soft delete)
  public deactivateCollaborator = async (id: number, createdByUserId: number): Promise<CollaboratorAccessModel> => {
    // Verificar que el colaborador pertenece al usuario
    await this.getMyCollaborator(id, createdByUserId);

    const { data, error } = await this.collaboratorContext
      .from(TableEnum.Collaborators)
      .update({ isactive: false })
      .eq(DatabaseColumns.EntityId, id)
      .eq(DatabaseColumns.CreatedByUserId, createdByUserId)
      .select()
      .single<CollaboratorEntity>();

    if (error) throw new Error(error.message);
    return this.getCollaboratorAccessModel(data);
  };

  // Verificar si se puede eliminar (no está en transacciones)
  public canDeleteCollaborator = async (collaboratorId: number): Promise<boolean> => {
    // Verificar en transactions
    const { data: transactionData, error: transactionError } = await this.collaboratorContext
      .from(TableEnum.Transactions)
      .select('id')
      .eq(DatabaseColumns.CollaboratorId, collaboratorId)
      .limit(1);

    if (transactionError) throw new Error(transactionError.message);
    if (transactionData && transactionData.length > 0) return false;

    // Verificar en transactionsplits
    const { data: splitData, error: splitError } = await this.collaboratorContext
      .from(TableEnum.TransactionSplits)
      .select('id')
      .eq(DatabaseColumns.CollaboratorId, collaboratorId)
      .limit(1);

    if (splitError) throw new Error(splitError.message);
    if (splitData && splitData.length > 0) return false;

    // Verificar en projectmembers
    const { data: memberData, error: memberError } = await this.collaboratorContext
      .from(TableEnum.ProjectMembers)
      .select('id')
      .eq(DatabaseColumns.CollaboratorId, collaboratorId)
      .limit(1);

    if (memberError) throw new Error(memberError.message);
    if (memberData && memberData.length > 0) return false;

    return true;
  };

  // Obtener estadísticas de colaboradores
  public getCollaboratorStats = async (createdByUserId: number) => {
    const { data, error } = await this.collaboratorContext
      .from(TableEnum.Collaborators)
      .select(`
        ${DatabaseColumns.EntityId},
        ${DatabaseColumns.Email}
      `)
      .eq(DatabaseColumns.CreatedByUserId, createdByUserId)
      .eq(DatabaseColumns.IsActive, true);

    if (error) throw new Error(error.message);

    const total = data?.length || 0;
    const internal = data?.filter(item => item.email === null).length || 0;
    const external = data?.filter(item => item.email !== null).length || 0;

    return {
      total,
      internal,
      external
    };
  };

  // Mappers privados
  private getCollaboratorAccessModel = (data: any): CollaboratorAccessModel => {
    return new CollaboratorAccessModel(
      data.id,
      data.name,
      data.surname,
      data.email,
      data.createdbyuserid,
      data.isactive,
      data.createddate,
      data.email ? 'EXTERNAL' : 'INTERNAL'
    );
  };

  private getEntity = (accessRequest: CreateCollaboratorAccessRequest | UpdateCollaboratorAccessRequest): CollaboratorEntity => {
    const entity = new CollaboratorEntity(
      accessRequest.name,
      accessRequest.surname,
      accessRequest.email,
      accessRequest.createdByUserId,
      true // isactive siempre true al crear/actualizar
    );

    if (accessRequest instanceof UpdateCollaboratorAccessRequest) {
      entity.id = accessRequest.id;
    }

    return entity;
  };
}