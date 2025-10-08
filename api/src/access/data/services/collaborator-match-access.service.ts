import { Injectable } from "@nestjs/common";
import { DatabaseColumns, TableEnum } from "../../../utility/enums";
import { CollaboratorMatchEntity } from "../entities/collaborator-match.entity";
import { CollaboratorMatchAccessModel, CreateMatchAccessRequest, ICollaboratorMatchAccessService } from "../../contract/collaborator-match";
import { BaseAccessService, DbContextService } from ".";

@Injectable()
export class CollaboratorMatchAccessService extends BaseAccessService implements ICollaboratorMatchAccessService {

  constructor(dbContextService: DbContextService) {
    super(dbContextService);
  }

  public getMatchByCollaboratorId = async (collaboratorId: number): Promise<CollaboratorMatchAccessModel | null> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.CollaboratorMatches)
      .select(DatabaseColumns.All)
      .or(`collaborator1id.eq.${collaboratorId},collaborator2id.eq.${collaboratorId}`)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }
    
    return this.getMatchAccessModel(data);
  };

  public getMatchesByUserId = async (userId: number): Promise<CollaboratorMatchAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.CollaboratorMatches)
      .select(DatabaseColumns.All)
      .or(`user1id.eq.${userId},user2id.eq.${userId}`)
      .order(DatabaseColumns.DateCreated, { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data?.map(this.getMatchAccessModel) || [];
  };

  public getMatchById = async (matchId: number): Promise<CollaboratorMatchAccessModel | null> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.CollaboratorMatches)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.EntityId, matchId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }

    return this.getMatchAccessModel(data);
  };

  public createMatch = async (request: CreateMatchAccessRequest): Promise<CollaboratorMatchAccessModel> => {
    const entity = this.getEntity(request);
    
    const { data, error } = await this.dbContext
      .from(TableEnum.CollaboratorMatches)
      .insert(entity)
      .select()
      .single<CollaboratorMatchEntity>();

    if (error) {
      throw new Error(error.message);
    }

    return this.getMatchAccessModel(data);
  };

  public deleteMatch = async (matchId: number): Promise<void> => {
    const { error } = await this.dbContext
      .from(TableEnum.CollaboratorMatches)
      .delete()
      .eq(DatabaseColumns.EntityId, matchId);

    if (error) {
      throw new Error(error.message);
    }
  };

  public existsMatch = async (collaborator1Id: number, collaborator2Id: number): Promise<boolean> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.CollaboratorMatches)
      .select('id')
      .or(`and(collaborator1id.eq.${collaborator1Id},collaborator2id.eq.${collaborator2Id}),and(collaborator1id.eq.${collaborator2Id},collaborator2id.eq.${collaborator1Id})`)
      .limit(1);

    if (error) {
      throw new Error(error.message);
    }

    return (data?.length || 0) > 0;
  };

  // Mappers
  private getMatchAccessModel = (data: CollaboratorMatchEntity): CollaboratorMatchAccessModel => {
    return new CollaboratorMatchAccessModel(
      data.id!,
      data.collaborator1id,
      data.collaborator2id,
      data.user1id,
      data.user2id,
      data.datecreated
    );
  };

  private getEntity = (request: CreateMatchAccessRequest): CollaboratorMatchEntity => {
    return new CollaboratorMatchEntity(
      request.collaborator1Id,
      request.collaborator2Id,
      request.user1Id,
      request.user2Id
    );
  };
}