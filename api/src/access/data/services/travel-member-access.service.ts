import { Injectable } from '@nestjs/common';
import { DatabaseColumns, TableEnum } from '../../../utility/enums';
import { BaseAccessService, DbContextService } from '.';
import { 
  ITravelMemberAccessService, 
  TravelMemberAccessModel, 
  AddTravelMemberAccessRequest 
} from '../../contract/travels';
import { TravelMemberEntity } from '../entities';

@Injectable()
export class TravelMemberAccessService extends BaseAccessService implements ITravelMemberAccessService {
  constructor(dbContextService: DbContextService) {
    super(dbContextService);
  }

  public add = async (request: AddTravelMemberAccessRequest): Promise<TravelMemberAccessModel> => {
    const entity = this.mapRequestToEntity(request);

    const { data, error } = await this.dbContext
      .from(TableEnum.TravelMembers)
      .insert(entity)
      .select()
      .single<TravelMemberEntity>();

    if (error) {
      throw new Error(error.message);
    }

    return this.mapEntityToAccessModel(data);
  };

  public getByTravelId = async (travelId: number): Promise<TravelMemberAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.TravelMembers)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.TravelId, travelId)
      .order(DatabaseColumns.JoinedDate, { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return data?.map(this.mapEntityToAccessModel) || [];
  };

  public getById = async (id: number): Promise<TravelMemberAccessModel | null> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.TravelMembers)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.EntityId, id)
      .single<TravelMemberEntity>();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }

    return this.mapEntityToAccessModel(data);
  };

  public isMemberInTravel = async (travelId: number, collaboratorId: number): Promise<boolean> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.TravelMembers)
      .select(DatabaseColumns.EntityId)
      .eq(DatabaseColumns.TravelId, travelId)
      .eq(DatabaseColumns.CollaboratorId, collaboratorId)
      .limit(1);

    if (error) {
      throw new Error(error.message);
    }

    return (data?.length || 0) > 0;
  };

  public remove = async (id: number): Promise<void> => {
    const { error } = await this.dbContext
      .from(TableEnum.TravelMembers)
      .delete()
      .eq(DatabaseColumns.EntityId, id);

    if (error) {
      throw new Error(error.message);
    }
  };

  public hasOperations = async (memberId: number): Promise<boolean> => {
    // Verificar si el miembro es quien pagó en alguna operación
    const { data: paidOperations, error: paidError } = await this.dbContext
      .from(TableEnum.TravelOperations)
      .select(DatabaseColumns.EntityId)
      .eq(DatabaseColumns.WhoPaidMemberId, memberId)
      .limit(1);

    if (paidError) {
      throw new Error(paidError.message);
    }

    if ((paidOperations?.length || 0) > 0) {
      return true;
    }

    // Verificar si el miembro es participante en alguna operación
    const { data: participantOperations, error: participantError } = await this.dbContext
      .from(TableEnum.TravelOperationParticipants)
      .select(DatabaseColumns.EntityId)
      .eq(DatabaseColumns.TravelMemberId, memberId)
      .limit(1);

    if (participantError) {
      throw new Error(participantError.message);
    }

    return (participantOperations?.length || 0) > 0;
  };

  public getMemberCount = async (travelId: number): Promise<number> => {
    const { count, error } = await this.dbContext
      .from(TableEnum.TravelMembers)
      .select(DatabaseColumns.EntityId, { count: 'exact', head: true })
      .eq(DatabaseColumns.TravelId, travelId);

    if (error) {
      throw new Error(error.message);
    }

    return count || 0;
  };

  public isUserInTravel = async (travelId: number, userId: number): Promise<boolean> => {
  const { data, error } = await this.dbContext
    .from(TableEnum.TravelMembers)
    .select(DatabaseColumns.EntityId)
    .eq(DatabaseColumns.TravelId, travelId)
    .eq(DatabaseColumns.UserId, userId)
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return (data?.length || 0) > 0;
};

  // Private methods
  private mapEntityToAccessModel = (entity: TravelMemberEntity): TravelMemberAccessModel => {
    return new TravelMemberAccessModel(
      entity.id!,
      entity.travelid,
      entity.userid,
      entity.collaboratorid,
      new Date(entity.joineddate!),
    );
  };

  private mapRequestToEntity = (request: AddTravelMemberAccessRequest): TravelMemberEntity => {
    return new TravelMemberEntity(
      request.travelId,
      request.userId,
      request.collaboratorId,
    );
  };
}