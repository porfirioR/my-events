import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { TableEnum, DatabaseColumns } from '../../../utility/enums';
import { CollaboratorAccessModel, CreateCollaboratorAccessRequest, CreateInternalCollaboratorAccessRequest, ICollaboratorAccessService, UpdateCollaboratorAccessRequest } from '../../../access/contract/collaborators';
import { BaseAccessService, DbContextService } from '.';
import { CollaboratorEntity } from '../entities';
import { CollaboratorType } from '../../../utility/types';


@Injectable()
export class CollaboratorAccessService extends BaseAccessService implements ICollaboratorAccessService{

  constructor(dbContextService: DbContextService) {
    super(dbContextService);
  }

  public assignEmailToCollaborator = async (collaboratorId: number, email: string, userId: number): Promise<CollaboratorAccessModel> => {
    const existingCollaborator = await this.getById(collaboratorId, userId);
    const entity = this.getEntityByAccessModel(existingCollaborator);
    entity.email = email;

    const { data, error } = await this.dbContext
      .from(TableEnum.Collaborators)
      .upsert(entity)
      .select()
      .single<CollaboratorEntity>();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }
    return this.mapEntityToAccessModel(data);
  };

  public getAll = async (userId: number): Promise<CollaboratorAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.Collaborators)
      .select<DatabaseColumns.All, CollaboratorEntity>(DatabaseColumns.All)
      .eq(DatabaseColumns.UserId, userId)
      .order(DatabaseColumns.DateCreated, { ascending: true });

    if (error) {
      throw new InternalServerErrorException(error.message);
    }
    return data?.map(this.mapEntityToAccessModel) || [];
  };

  public getUnlinkedCollaborators = async (userId: number): Promise<CollaboratorAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.Collaborators)
      .select<DatabaseColumns.All, CollaboratorEntity>(DatabaseColumns.All)
      .eq(DatabaseColumns.UserId, userId)
      .eq(DatabaseColumns.IsActive, true)
      .is(DatabaseColumns.Email, null)
      .order(DatabaseColumns.Name, { ascending: true });

    if (error) {
      throw new InternalServerErrorException(error.message);
    }
    return data?.map(this.mapEntityToAccessModel) || [];
  };

  public getLinkedCollaborators = async (userId: number): Promise<CollaboratorAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.Collaborators)
      .select<DatabaseColumns.All, CollaboratorEntity>(DatabaseColumns.All)
      .eq(DatabaseColumns.UserId, userId)
      .eq(DatabaseColumns.IsActive, true)
      .not(DatabaseColumns.Email, 'is', null)
      .order(DatabaseColumns.Name, { ascending: true });

    if (error) {
      throw new InternalServerErrorException(error.message);
    }
    return data?.map(this.mapEntityToAccessModel) || [];
  };

  public getById = async (id: number, userId: number): Promise<CollaboratorAccessModel> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.Collaborators)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.EntityId, id)
      .eq(DatabaseColumns.UserId, userId)
      .single<CollaboratorEntity>();

    if (error) {
      if (error.code === 'PGRST116') throw new NotFoundException(`Collaborator with id ${id} not found`);
      throw new InternalServerErrorException(error.message);
    }
    return this.mapEntityToAccessModel(data);
  };

  public createCollaborator = async (accessRequest: CreateCollaboratorAccessRequest): Promise<CollaboratorAccessModel> => {
    const collaboratorEntity = this.getEntity(accessRequest);
    const { data, error } = await this.dbContext
      .from(TableEnum.Collaborators)
      .insert(collaboratorEntity)
      .select()
      .single<CollaboratorEntity>();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }
    return this.mapEntityToAccessModel(data);
  };

  public updateCollaborator = async (accessRequest: UpdateCollaboratorAccessRequest): Promise<CollaboratorAccessModel> => {
    const existingCollaborator = await this.getById(accessRequest.id, accessRequest.userId);
    const entity = this.getEntity(accessRequest);
    entity.id = accessRequest.id;
    entity.userid = existingCollaborator.userId;
    entity.datecreated = existingCollaborator.dateCreated;
    entity.isactive = existingCollaborator.isActive;
    entity.email = existingCollaborator.email;

    const { data, error } = await this.dbContext
      .from(TableEnum.Collaborators)
      .upsert(entity)
      .select()
      .single<CollaboratorEntity>();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }
    return this.mapEntityToAccessModel(data);
  };

  public changeVisibility = async (id: number, userId: number): Promise<CollaboratorAccessModel> => {
    const accessModel = await this.getById(id, userId);

    const { data, error } = await this.dbContext
      .from(TableEnum.Collaborators)
      .update({ isactive: !accessModel.isActive })
      .eq(DatabaseColumns.EntityId, id)
      .eq(DatabaseColumns.UserId, userId)
      .select()
      .single<CollaboratorEntity>();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }
    return this.mapEntityToAccessModel(data);
  };

  public canDeleteCollaborator = async (collaboratorId: number): Promise<{ canDelete: boolean; reason?: string }> => {
    // Verificar en transactions
    const { data: transactionData, error: transactionError } = await this.dbContext
      .from(TableEnum.Transactions)
      .select('id')
      .eq(DatabaseColumns.CollaboratorId, collaboratorId)
      .limit(1);

    if (transactionError) throw new InternalServerErrorException(transactionError.message);
    if (transactionData && transactionData.length > 0)
      return { canDelete: false, reason: 'collaborators.collaboratorAssociatedToTransactions' };

    // Verificar en transaction splits
    const { data: splitData, error: splitError } = await this.dbContext
      .from(TableEnum.TransactionSplits)
      .select('id')
      .eq(DatabaseColumns.CollaboratorId, collaboratorId)
      .limit(1);

    if (splitError) throw new InternalServerErrorException(splitError.message);
    if (splitData && splitData.length > 0)
      return { canDelete: false, reason: 'collaborators.collaboratorAssociatedToTransactions' };

    // Verificar en travel members
    const { data: travelMemberData, error: travelMemberError } = await this.dbContext
      .from(TableEnum.TravelMembers)
      .select('id')
      .eq(DatabaseColumns.CollaboratorId, collaboratorId)
      .limit(1);

    if (travelMemberError) throw new InternalServerErrorException(travelMemberError.message);
    if (travelMemberData && travelMemberData.length > 0)
      return { canDelete: false, reason: 'collaborators.collaboratorAssociatedToTravels' };

    // Verificar en collaborator matches
    const { data: matchData, error: matchError } = await this.dbContext
      .from(TableEnum.CollaboratorMatches)
      .select('id')
      .or(`collaborator1id.eq.${collaboratorId},collaborator2id.eq.${collaboratorId}`)
      .limit(1);

    if (matchError) throw new InternalServerErrorException(matchError.message);
    if (matchData && matchData.length > 0)
      return { canDelete: false, reason: 'collaborators.collaboratorAssociatedToMatches' };

    // Verificar en match requests
    const { data: requestData, error: requestError } = await this.dbContext
      .from(TableEnum.CollaboratorMatchRequests)
      .select('id')
      .eq(DatabaseColumns.RequesterCollaboratorId, collaboratorId)
      .limit(1);

    if (requestError) throw new InternalServerErrorException(requestError.message);
    if (requestData && requestData.length > 0)
      return { canDelete: false, reason: 'collaborators.collaboratorAssociatedToMatches' };

    return { canDelete: true };
  };

  public deleteCollaborator = async (collaboratorId: number, userId: number): Promise<void> => {
    const { error } = await this.dbContext
      .from(TableEnum.Collaborators)
      .delete()
      .eq(DatabaseColumns.EntityId, collaboratorId)
      .eq(DatabaseColumns.UserId, userId);

    if (error) {
      throw new InternalServerErrorException(error.message);
    }
  };

  public getCollaboratorStats = async (userId: number): Promise<{
    total: number;
    internal: number;
    external: number;
  }> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.Collaborators)
      .select(`
        ${DatabaseColumns.EntityId},
        ${DatabaseColumns.Email}
      `)
      .eq(DatabaseColumns.UserId, userId)
      .eq(DatabaseColumns.IsActive, true);

    if (error) {
      throw new InternalServerErrorException(error.message);
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

  public getMyCollaboratorByEmail = async (email: string, userId: number): Promise<CollaboratorAccessModel | null> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.Collaborators)
      .select<DatabaseColumns.All, CollaboratorEntity>(DatabaseColumns.All)
      .eq(DatabaseColumns.Email, email)
      .eq(DatabaseColumns.UserId, userId)
      .eq(DatabaseColumns.IsActive, true)
      .single<CollaboratorEntity>();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new InternalServerErrorException(error.message);
    }
    return this.mapEntityToAccessModel(data);
  };

  public getByEmail = async (email: string): Promise<CollaboratorAccessModel | null> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.Collaborators)
      .select<DatabaseColumns.All, CollaboratorEntity>(DatabaseColumns.All)
      .eq(DatabaseColumns.Email, email)
      .eq(DatabaseColumns.IsActive, true)
      .single<CollaboratorEntity>();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new InternalServerErrorException(error.message);
    }
    return this.mapEntityToAccessModel(data);
  };

  public getExternalCollaboratorsByEmail = async (email: string): Promise<CollaboratorAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.Collaborators)
      .select<DatabaseColumns.All, CollaboratorEntity>(DatabaseColumns.All)
      .eq(DatabaseColumns.Email, email)
      .eq(DatabaseColumns.IsActive, true)
      .not(DatabaseColumns.Email, 'is', null);

    if (error) {
      throw new InternalServerErrorException(error.message);
    }
    return data?.map(this.mapEntityToAccessModel) || [];
  };

/**
   * ✅ NUEVO: Obtener colaborador interno por userId y email
   * Colaborador interno tiene el mismo email que el usuario propietario
   */
  public getInternalCollaboratorByUserIdAndEmail = async (
    userId: number, 
    userEmail: string
  ): Promise<CollaboratorAccessModel | null> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.Collaborators)
      .select<DatabaseColumns.All, CollaboratorEntity>(DatabaseColumns.All)
      .eq(DatabaseColumns.UserId, userId)
      .eq(DatabaseColumns.Email, userEmail) // Colaborador interno = email del usuario
      .eq(DatabaseColumns.IsActive, true)
      .single<CollaboratorEntity>();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new InternalServerErrorException(error.message);
    }

    return this.mapEntityToAccessModel(data);
  };

  /**
   * ✅ NUEVO: Verificar si existe colaborador interno
   */
  public hasInternalCollaborator = async (userId: number, userEmail: string): Promise<boolean> => {
    const { count, error } = await this.dbContext
      .from(TableEnum.Collaborators)
      .select(DatabaseColumns.EntityId, { count: 'exact', head: true })
      .eq(DatabaseColumns.UserId, userId)
      .eq(DatabaseColumns.Email, userEmail)
      .eq(DatabaseColumns.IsActive, true);

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return (count || 0) > 0;
  };

  /**
   * ✅ NUEVO: Crear colaborador interno específicamente
   * Usa un request especial que incluye email
   */
  public createInternalCollaborator = async (
    userId: number,
    userEmail: string, 
    name: string,
    surname: string
  ): Promise<CollaboratorAccessModel> => {
    // Verificar que no exista ya
    const existing = await this.hasInternalCollaborator(userId, userEmail);
    if (existing) {
      throw new ConflictException('Internal collaborator already exists for this user');
    }

    // ✅ Crear request especial para colaborador interno
    const internalRequest = new CreateInternalCollaboratorAccessRequest(
      name,
      surname,
      userEmail, // ✅ El email del usuario = colaborador interno
      userId
    );

    return await this.createInternalCollaboratorEntity(internalRequest);
  };

  /**
   * ✅ NUEVO: Método especial para crear colaborador interno con email
   */
  private createInternalCollaboratorEntity = async (
    accessRequest: CreateInternalCollaboratorAccessRequest
  ): Promise<CollaboratorAccessModel> => {
    const collaboratorEntity = new CollaboratorEntity(
      accessRequest.name,
      accessRequest.surname,
      accessRequest.email, // ✅ MANTENER email (no null como en colaboradores normales)
      accessRequest.userId,
      true // activo
    );

    const { data, error } = await this.dbContext
      .from(TableEnum.Collaborators)
      .insert(collaboratorEntity)
      .select()
      .single<CollaboratorEntity>();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return this.mapEntityToAccessModel(data);
  };

  // ==================== MAPPERS PRIVADOS (ACTUALIZADOS) ====================

  private mapEntityToAccessModel = (data: CollaboratorEntity): CollaboratorAccessModel => {
    // Determinar tipo usando tu lógica actual
    const type: CollaboratorType = data.email ? 'LINKED' : 'UNLINKED';

    return new CollaboratorAccessModel(
      data.id,
      data.name,
      data.surname,
      data.email,
      data.userid,
      data.isactive,
      data.datecreated,
      type // ✅ Usar tu CollaboratorType
    );
  };

  /**
   * ✅ MANTENER: Tu getEntity actual (sin cambios)
   */
  private getEntity = (accessRequest: CreateCollaboratorAccessRequest | UpdateCollaboratorAccessRequest): CollaboratorEntity => {
    const entity = new CollaboratorEntity(
      accessRequest.name,
      accessRequest.surname,
      null, // email siempre null para colaboradores normales
      accessRequest.userId,
      true
    );

    if (accessRequest instanceof UpdateCollaboratorAccessRequest) {
      entity.id = accessRequest.id;
    }

    return entity;
  };

  /**
   * ✅ MANTENER: Tu getEntityByAccessModel actual (sin cambios)
   */
  private getEntityByAccessModel = (accessModel: CollaboratorAccessModel): CollaboratorEntity => {
    const entity = new CollaboratorEntity(
      accessModel.name,
      accessModel.surname,
      null,
      accessModel.userId,
      accessModel.isActive,
      accessModel.dateCreated
    );
    entity.id = accessModel.id;

    return entity;
  };

}