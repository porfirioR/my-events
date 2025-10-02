import { Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { DbContextService } from './db-context.service';
import { CollaboratorEntity } from '../entities/collaborator.entity';
import { TableEnum, DatabaseColumns } from '../../../utility/enums';
import { CollaboratorAccessModel, CreateCollaboratorAccessRequest, ICollaboratorAccessService, UpdateCollaboratorAccessRequest } from '../../../access/contract/collaborators';


@Injectable()
export class CollaboratorAccessService implements ICollaboratorAccessService{
  private collaboratorContext: SupabaseClient<any, 'public', any>;

  constructor(private dbContextService: DbContextService) {
    this.collaboratorContext = this.dbContextService.getConnection();
  }

  public getAll = async (userId: number): Promise<CollaboratorAccessModel[]> => {
    const { data, error } = await this.collaboratorContext
      .from(TableEnum.Collaborators)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.UserId, userId)
      .order(DatabaseColumns.DateCreated, { ascending: true });

    if (error) {
      throw new Error(error.message);
    }
    return data?.map(this.getCollaboratorAccessModel) || [];
  };

  public getInternalCollaborators = async (userId: number): Promise<CollaboratorAccessModel[]> => {
    const { data, error } = await this.collaboratorContext
      .from(TableEnum.Collaborators)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.UserId, userId)
      .eq(DatabaseColumns.IsActive, true)
      .is(DatabaseColumns.Email, null)
      .order(DatabaseColumns.Name, { ascending: true });

    if (error) {
      throw new Error(error.message);
    }
    return data?.map(this.getCollaboratorAccessModel) || [];
  };

  public getExternalCollaborators = async (userId: number): Promise<CollaboratorAccessModel[]> => {
    const { data, error } = await this.collaboratorContext
      .from(TableEnum.Collaborators)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.UserId, userId)
      .eq(DatabaseColumns.IsActive, true)
      .not(DatabaseColumns.Email, 'is', null)
      .order(DatabaseColumns.Name, { ascending: true });

    if (error) {
      throw new Error(error.message);
    }
    return data?.map(this.getCollaboratorAccessModel) || [];
  };

  public getById = async (id: number, userId: number): Promise<CollaboratorAccessModel> => {
    const { data, error } = await this.collaboratorContext
      .from(TableEnum.Collaborators)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.EntityId, id)
      .eq(DatabaseColumns.UserId, userId)
      .single();

    if (error) {
      throw new Error(error.message);
    }
    return this.getCollaboratorAccessModel(data);
  };

  public createCollaborator = async (accessRequest: CreateCollaboratorAccessRequest): Promise<CollaboratorAccessModel> => {
    const collaboratorEntity = this.getEntity(accessRequest);
    const { data, error } = await this.collaboratorContext
      .from(TableEnum.Collaborators)
      .insert(collaboratorEntity)
      .select()
      .single<CollaboratorEntity>();

    if (error) {
      throw new Error(error.message);
    }
    return this.getCollaboratorAccessModel(data);
  };

  public updateCollaborator = async (accessRequest: UpdateCollaboratorAccessRequest): Promise<CollaboratorAccessModel> => {
    const existingCollaborator = await this.getById(accessRequest.id, accessRequest.userId);
    const entity = this.getEntity(accessRequest);
    entity.id = accessRequest.id;
    entity.userid = existingCollaborator.userId;
    entity.datecreated = existingCollaborator.dateCreated;
    entity.isactive = existingCollaborator.isActive;
    entity.email = existingCollaborator.email;

    const { data, error } = await this.collaboratorContext
      .from(TableEnum.Collaborators)
      .upsert(entity)
      .select()
      .single<CollaboratorEntity>();

    if (error) {
      throw new Error(error.message);
    }
    return this.getCollaboratorAccessModel(data);
  };

  public changeVisibility = async (id: number, userId: number): Promise<CollaboratorAccessModel> => {
    const accessModel = await this.getById(id, userId);

    const { data, error } = await this.collaboratorContext
      .from(TableEnum.Collaborators)
      .update({ isactive: !accessModel.isActive })
      .eq(DatabaseColumns.EntityId, id)
      .eq(DatabaseColumns.UserId, userId)
      .select()
      .single<CollaboratorEntity>();

    if (error) {
      throw new Error(error.message);
    }
    return this.getCollaboratorAccessModel(data);
  };

  public canDeleteCollaborator = async (collaboratorId: number): Promise<boolean> => {
    // Verificar en transactions
    const { data: transactionData, error: transactionError } = await this.collaboratorContext
      .from(TableEnum.Transactions)
      .select('id')
      .eq(DatabaseColumns.CollaboratorId, collaboratorId)
      .limit(1);

    if (transactionError) throw new Error(transactionError.message);
    if (transactionData && transactionData.length > 0) return false;

    const { data: splitData, error: splitError } = await this.collaboratorContext
      .from(TableEnum.TransactionSplits)
      .select('id')
      .eq(DatabaseColumns.CollaboratorId, collaboratorId)
      .limit(1);

    if (splitError) throw new Error(splitError.message);
    if (splitData && splitData.length > 0) return false;

    const { data: memberData, error: memberError } = await this.collaboratorContext
      .from(TableEnum.ProjectMembers)
      .select('id')
      .eq(DatabaseColumns.CollaboratorId, collaboratorId)
      .limit(1);

    if (memberError) throw new Error(memberError.message);
    if (memberData && memberData.length > 0) return false;

    return true;
  };

  public getCollaboratorStats = async (userId: number) => {
    const { data, error } = await this.collaboratorContext
      .from(TableEnum.Collaborators)
      .select(`
        ${DatabaseColumns.EntityId},
        ${DatabaseColumns.Email}
      `)
      .eq(DatabaseColumns.UserId, userId)
      .eq(DatabaseColumns.IsActive, true);

    if (error) {
      throw new Error(error.message);
    }

    const total = data?.length || 0;
    const internal = data?.filter(item => item.email === null).length || 0;
    const external = data?.filter(item => item.email !== null).length || 0;

    return {
      total,
      internal,
      external
    };
  };

  public getByEmail = async (email: string): Promise<CollaboratorAccessModel | null> => {
    const { data, error } = await this.collaboratorContext
      .from(TableEnum.Collaborators)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.Email, email)
      .eq(DatabaseColumns.IsActive, true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }
    return this.getCollaboratorAccessModel(data);
  };

  public getExternalCollaboratorsByEmail = async (email: string): Promise<CollaboratorAccessModel[]> => {
    const { data, error } = await this.collaboratorContext
      .from(TableEnum.Collaborators)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.Email, email)
      .eq(DatabaseColumns.IsActive, true)
      .not(DatabaseColumns.Email, 'is', null);

    if (error) {
      throw new Error(error.message);
    }
    return data?.map(this.getCollaboratorAccessModel) || [];
  };

  // Mappers privados
  private getCollaboratorAccessModel = (data: CollaboratorEntity): CollaboratorAccessModel => {
    return new CollaboratorAccessModel(
      data.id,
      data.name,
      data.surname,
      data.email,
      data.userid,
      data.isactive,
      data.datecreated,
      data.email ? 'EXTERNAL' : 'INTERNAL'
    );
  };

  private getEntity = (accessRequest: CreateCollaboratorAccessRequest | UpdateCollaboratorAccessRequest): CollaboratorEntity => {
    const entity = new CollaboratorEntity(
      accessRequest.name,
      accessRequest.surname,
      null, // email siempre null al crear/actualizar
      accessRequest.userId,
      true // isactive siempre true al crear/actualizar
    );

    if (accessRequest instanceof UpdateCollaboratorAccessRequest) {
      entity.id = accessRequest.id;
    }

    return entity;
  };
}