// collaborator-match-request-access.service.ts
import { Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { DbContextService } from './db-context.service';
import { CollaboratorMatchRequestEntity } from '../entities/collaborator-match-request.entity';
import { TableEnum, DatabaseColumns, MatchRequestStatus } from '../../../utility/enums';
import { CollaboratorMatchRequestAccessModel, CreateMatchRequestAccessRequest, ICollaboratorMatchRequestAccessService } from '../../../access/contract/collaborator-match-requests';


@Injectable()
export class CollaboratorMatchRequestAccessService implements ICollaboratorMatchRequestAccessService {
  private requestContext: SupabaseClient<any, 'public', any>;

  constructor(private dbContextService: DbContextService) {
    this.requestContext = this.dbContextService.getConnection();
  }

  public getReceivedRequests = async (userId: number, status?: MatchRequestStatus): Promise<CollaboratorMatchRequestAccessModel[]> => {
    let query = this.requestContext
      .from(TableEnum.CollaboratorMatchRequests)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.TargetUserId, userId);

    if (status) {
      query = query.eq(DatabaseColumns.Status, status);
    }

    const { data, error } = await query.order(DatabaseColumns.RequestedDate, { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data?.map(this.getRequestAccessModel) || [];
  };

  public getSentRequests = async (
    userId: number,
    status?: MatchRequestStatus
  ): Promise<CollaboratorMatchRequestAccessModel[]> => {
    let query = this.requestContext
      .from(TableEnum.CollaboratorMatchRequests)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.RequesterUserId, userId);

    if (status) {
      query = query.eq(DatabaseColumns.Status, status);
    }

    const { data, error } = await query.order(DatabaseColumns.RequestedDate, { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data?.map(this.getRequestAccessModel) || [];
  };

  public getRequestsByCollaborator = async (
    collaboratorId: number,
    status?: MatchRequestStatus
  ): Promise<CollaboratorMatchRequestAccessModel[]> => {
    let query = this.requestContext
      .from(TableEnum.CollaboratorMatchRequests)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.RequesterCollaboratorId, collaboratorId);

    if (status) {
      query = query.eq(DatabaseColumns.Status, status);
    }

    const { data, error } = await query.order(DatabaseColumns.RequestedDate, { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data?.map(this.getRequestAccessModel) || [];
  };

  public getById = async (requestId: number, userId: number): Promise<CollaboratorMatchRequestAccessModel> => {
    const { data, error } = await this.requestContext
      .from(TableEnum.CollaboratorMatchRequests)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.EntityId, requestId)
      .or(`requesteruserid.eq.${userId},targetuserid.eq.${userId}`)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return this.getRequestAccessModel(data);
  };

  public createRequest = async (request: CreateMatchRequestAccessRequest): Promise<CollaboratorMatchRequestAccessModel> => {
    const entity = this.getEntity(request);

    const { data, error } = await this.requestContext
      .from(TableEnum.CollaboratorMatchRequests)
      .insert(entity)
      .select()
      .single<CollaboratorMatchRequestEntity>();

    if (error) {
      throw new Error(error.message);
    }

    return this.getRequestAccessModel(data);
  };

  public updateStatus = async (requestId: number, status: MatchRequestStatus, userId?: number): Promise<CollaboratorMatchRequestAccessModel> => {
    const { data, error } = await this.requestContext
      .from(TableEnum.CollaboratorMatchRequests)
      .update({
        status: status,
        datecreated: new Date().toISOString()
      })
      .eq(DatabaseColumns.EntityId, requestId)
      .eq(DatabaseColumns.TargetUserId, userId)
      .select()
      .single<CollaboratorMatchRequestEntity>();

    if (error) {
      throw new Error(error.message);
    }

    return this.getRequestAccessModel(data);
  };

  //TODO update this method from update to upsert
  public updateTargetUser = async (requestId: number, targetUserId: number): Promise<CollaboratorMatchRequestAccessModel> => {
    const { data, error } = await this.requestContext
      .from(TableEnum.CollaboratorMatchRequests)
      .update({
        targetuserid: targetUserId,
        status: MatchRequestStatus.Pending
      })
      .eq(DatabaseColumns.EntityId, requestId)
      .select()
      .single<CollaboratorMatchRequestEntity>();

    if (error) {
      throw new Error(error.message);
    }

    return this.getRequestAccessModel(data);
  };

  public existsPendingRequest = async (
    collaboratorId: number,
    targetEmail: string
  ): Promise<boolean> => {
    const { data, error } = await this.requestContext
      .from(TableEnum.CollaboratorMatchRequests)
      .select('id')
      .eq(DatabaseColumns.RequesterCollaboratorId, collaboratorId)
      .eq(DatabaseColumns.TargetCollaboratorEmail, targetEmail)
      .in(DatabaseColumns.Status, [MatchRequestStatus.Pending, MatchRequestStatus.EmailNotFound])
      .limit(1);

    if (error) {
      throw new Error(error.message);
    }

    return (data?.length || 0) > 0;
  };

  public getRequestsByEmail = async (email: string, status?: MatchRequestStatus): Promise<CollaboratorMatchRequestAccessModel[]> => {
    let query = this.requestContext
      .from(TableEnum.CollaboratorMatchRequests)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.TargetCollaboratorEmail, email);

    if (status) {
      query = query.eq(DatabaseColumns.Status, status);
    }

    const { data, error } = await query.order(DatabaseColumns.RequestedDate, { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data?.map(this.getRequestAccessModel) || [];
  };

  public deleteRequest = async (requestId: number, userId: number): Promise<void> => {
    const { error } = await this.requestContext
      .from(TableEnum.CollaboratorMatchRequests)
      .delete()
      .eq(DatabaseColumns.EntityId, requestId)
      .eq(DatabaseColumns.RequesterUserId, userId);

    if (error) {
      throw new Error(error.message);
    }
  };

  /**
   * ⭐ NUEVO: Verificar si YA envié una invitación a este email (sin importar el estado)
   * Esto previene invitar múltiples veces
   */
  public hasEverSentRequest = async (
    collaboratorId: number,
    targetEmail: string
  ): Promise<boolean> => {
    const { data, error } = await this.requestContext
      .from(TableEnum.CollaboratorMatchRequests)
      .select('id')
      .eq(DatabaseColumns.RequesterCollaboratorId, collaboratorId)
      .eq(DatabaseColumns.TargetCollaboratorEmail, targetEmail)
      .limit(1);

    if (error) {
      throw new Error(error.message);
    }

    return (data?.length || 0) > 0;
  };

  /**
   * ⭐ NUEVO: Verificar si este email ya me envió una invitación pendiente
   */
  public hasReceivedPendingInvitation = async (
    targetEmail: string,
    myUserId: number
  ): Promise<boolean> => {
    // Buscar colaboradores externos míos con ese email
    const { data: myCollaborators, error: collabError } = await this.requestContext
      .from(TableEnum.Collaborators)
      .select('email')
      .eq(DatabaseColumns.UserId, myUserId)
      .eq(DatabaseColumns.Email, targetEmail)
      .limit(1);

    if (collabError) {
      throw new Error(collabError.message);
    }

    if (!myCollaborators || myCollaborators.length === 0) {
      return false; // No tengo colaborador con ese email
    }

    // Buscar solicitudes pendientes hacia ese email donde yo soy el target
    const { data, error } = await this.requestContext
      .from(TableEnum.CollaboratorMatchRequests)
      .select('id')
      .eq(DatabaseColumns.TargetCollaboratorEmail, targetEmail)
      .eq(DatabaseColumns.TargetUserId, myUserId)
      .eq(DatabaseColumns.Status, MatchRequestStatus.Pending)
      .limit(1);

    if (error) {
      throw new Error(error.message);
    }

    return (data?.length || 0) > 0;
  };

  // Mappers
  private getRequestAccessModel = (data: CollaboratorMatchRequestEntity): CollaboratorMatchRequestAccessModel => {
    return {
      id: data.id,
      requesterUserId: data.requesteruserid,
      requesterCollaboratorId: data.requestercollaboratorid,
      targetUserId: data.targetuserid,
      targetCollaboratorEmail: data.targetcollaboratoremail,
      status: data.status as MatchRequestStatus,
      requestedDate: data.requesteddate,
      responseDate: data.responsedate
    };
  };

  private getEntity = (request: CreateMatchRequestAccessRequest): Partial<CollaboratorMatchRequestEntity> => {
    return {
      requesteruserid: request.requesterUserId,
      requestercollaboratorid: request.requesterCollaboratorId,
      targetuserid: request.targetUserId,
      targetcollaboratoremail: request.targetCollaboratorEmail,
      status: MatchRequestStatus.Pending
    };
  };
}