import { Injectable } from '@nestjs/common';
import { DatabaseColumns, TableEnum } from '../../../utility/enums';
import { BaseAccessService, DbContextService } from '.';
import { 
  ITravelOperationParticipantAccessService, 
  TravelOperationParticipantAccessModel, 
  AddOperationParticipantAccessRequest 
} from '../../contract/travels';
import { TravelOperationParticipantEntity } from '../entities';

@Injectable()
export class TravelOperationParticipantAccessService 
  extends BaseAccessService 
  implements ITravelOperationParticipantAccessService 
{
  constructor(dbContextService: DbContextService) {
    super(dbContextService);
  }

  public add = async (request: AddOperationParticipantAccessRequest): Promise<TravelOperationParticipantAccessModel> => {
    const entity = this.mapRequestToEntity(request);

    const { data, error } = await this.dbContext
      .from(TableEnum.TravelOperationParticipants)
      .insert(entity)
      .select()
      .single<TravelOperationParticipantEntity>();

    if (error) {
      throw new Error(error.message);
    }

    return this.mapEntityToAccessModel(data);
  };

  public addMultiple = async (
    requests: AddOperationParticipantAccessRequest[],
  ): Promise<TravelOperationParticipantAccessModel[]> => {
    const entities = requests.map(this.mapRequestToEntity);

    const { data, error } = await this.dbContext
      .from(TableEnum.TravelOperationParticipants)
      .insert(entities)
      .select();

    if (error) {
      throw new Error(error.message);
    }

    return data?.map(this.mapEntityToAccessModel) || [];
  };

  public getByOperationId = async (operationId: number): Promise<TravelOperationParticipantAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.TravelOperationParticipants)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.OperationId, operationId)
      .order(DatabaseColumns.DateCreated, { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return data?.map(this.mapEntityToAccessModel) || [];
  };

  public updateShareAmount = async (
    id: number,
    shareAmount: number,
  ): Promise<TravelOperationParticipantAccessModel> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.TravelOperationParticipants)
      .update({ shareamount: shareAmount })
      .eq(DatabaseColumns.EntityId, id)
      .select()
      .single<TravelOperationParticipantEntity>();

    if (error) {
      throw new Error(error.message);
    }

    return this.mapEntityToAccessModel(data);
  };

  public remove = async (id: number): Promise<void> => {
    const { error } = await this.dbContext
      .from(TableEnum.TravelOperationParticipants)
      .delete()
      .eq(DatabaseColumns.EntityId, id);

    if (error) {
      throw new Error(error.message);
    }
  };

  public removeParticipant = async (operationId: number, memberId: number): Promise<void> => {
    const { error } = await this.dbContext
      .from(TableEnum.TravelOperationParticipants)
      .delete()
      .eq(DatabaseColumns.OperationId, operationId)
      .eq(DatabaseColumns.TravelMemberId, memberId);

    if (error) {
      throw new Error(error.message);
    }
  };

  public removeAllByOperationId = async (operationId: number): Promise<void> => {
    const { error } = await this.dbContext
      .from(TableEnum.TravelOperationParticipants)
      .delete()
      .eq(DatabaseColumns.OperationId, operationId);

    if (error) {
      throw new Error(error.message);
    }
  };

  public isParticipant = async (operationId: number, travelMemberId: number): Promise<boolean> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.TravelOperationParticipants)
      .select(DatabaseColumns.EntityId)
      .eq(DatabaseColumns.OperationId, operationId)
      .eq(DatabaseColumns.TravelMemberId, travelMemberId)
      .limit(1);

    if (error) {
      throw new Error(error.message);
    }

    return (data?.length || 0) > 0;
  };

  public getParticipantCount = async (operationId: number): Promise<number> => {
    const { count, error } = await this.dbContext
      .from(TableEnum.TravelOperationParticipants)
      .select(DatabaseColumns.EntityId, { count: 'exact', head: true })
      .eq(DatabaseColumns.OperationId, operationId);

    if (error) {
      throw new Error(error.message);
    }

    return count || 0;
  };

  // Private methods
  private mapEntityToAccessModel = (
    entity: TravelOperationParticipantEntity,
  ): TravelOperationParticipantAccessModel => {
    return new TravelOperationParticipantAccessModel(
      entity.id!,
      entity.travelmemberid,
      parseFloat(entity.shareamount.toString()),
      entity.operationid,
      new Date(entity.datecreated!),
    );
  };

  private mapRequestToEntity = (
    request: AddOperationParticipantAccessRequest,
  ): TravelOperationParticipantEntity => {
    return new TravelOperationParticipantEntity(
      request.operationId,
      request.travelMemberId,
      request.shareAmount,
    );
  };
}