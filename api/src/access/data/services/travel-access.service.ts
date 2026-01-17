import { Injectable } from '@nestjs/common';
import { DatabaseColumns, TableEnum, TravelStatus } from '../../../utility/enums';
import { BaseAccessService, DbContextService } from '.';
import { 
  ITravelAccessService, 
  TravelAccessModel, 
  CreateTravelAccessRequest, 
  UpdateTravelAccessRequest 
} from '../../contract/travels';
import { TravelEntity } from '../entities';

@Injectable()
export class TravelAccessService extends BaseAccessService implements ITravelAccessService {
  constructor(dbContextService: DbContextService) {
    super(dbContextService);
  }

  public create = async (request: CreateTravelAccessRequest): Promise<TravelAccessModel> => {
    const entity = this.mapCreateRequestToEntity(request);

    const { data, error } = await this.dbContext
      .from(TableEnum.Travels)
      .insert(entity)
      .select()
      .single<TravelEntity>();

    if (error) {
      throw new Error(error.message);
    }

    return this.mapEntityToAccessModel(data);
  };

  public getById = async (id: number, userId: number): Promise<TravelAccessModel | null> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.Travels)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.EntityId, id)
      .eq(DatabaseColumns.CreatedByUserId, userId)
      .single<TravelEntity>();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }

    return this.mapEntityToAccessModel(data);
  };

  public getAllByUserId = async (userId: number): Promise<TravelAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.Travels)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.CreatedByUserId, userId)
      .order(DatabaseColumns.DateCreated, { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data?.map(this.mapEntityToAccessModel) || [];
  };

  public getByStatus = async (userId: number, status: string): Promise<TravelAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.Travels)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.CreatedByUserId, userId)
      .eq(DatabaseColumns.Status, status)
      .order(DatabaseColumns.DateCreated, { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data?.map(this.mapEntityToAccessModel) || [];
  };

  public update = async (request: UpdateTravelAccessRequest): Promise<TravelAccessModel> => {
    const entity = this.mapUpdateRequestToEntity(request);

    const { data, error } = await this.dbContext
      .from(TableEnum.Travels)
      .update({
        name: entity.name,
        description: entity.description,
        startdate: entity.startdate,
        enddate: entity.enddate,
        defaultcurrencyid: entity.defaultcurrencyid,
        status: entity.status,
        lastupdatedbyuserid: entity.lastupdatedbyuserid,
        updatedat: new Date().toISOString(),
        finalizeddate: entity.finalizeddate,
      })
      .eq(DatabaseColumns.EntityId, request.id)
      .eq(DatabaseColumns.CreatedByUserId, request.createdByUserId)
      .select()
      .single<TravelEntity>();

    if (error) {
      throw new Error(error.message);
    }

    return this.mapEntityToAccessModel(data);
  };

  public finalize = async (id: number, userId: number): Promise<TravelAccessModel> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.Travels)
      .update({
        status: TravelStatus.Finalized,
        finalizeddate: new Date().toISOString(),
        lastupdatedbyuserid: userId,
        updatedat: new Date().toISOString(),
      })
      .eq(DatabaseColumns.EntityId, id)
      .eq(DatabaseColumns.CreatedByUserId, userId)
      .select()
      .single<TravelEntity>();

    if (error) {
      throw new Error(error.message);
    }

    return this.mapEntityToAccessModel(data);
  };

  public delete = async (id: number, userId: number): Promise<void> => {
    const { error } = await this.dbContext
      .from(TableEnum.Travels)
      .delete()
      .eq(DatabaseColumns.EntityId, id)
      .eq(DatabaseColumns.CreatedByUserId, userId);

    if (error) {
      throw new Error(error.message);
    }
  };

  public isCreator = async (travelId: number, userId: number): Promise<boolean> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.Travels)
      .select(DatabaseColumns.EntityId)
      .eq(DatabaseColumns.EntityId, travelId)
      .eq(DatabaseColumns.CreatedByUserId, userId)
      .limit(1);

    if (error) {
      throw new Error(error.message);
    }

    return (data?.length || 0) > 0;
  };

  public isMember = async (travelId: number, userId: number): Promise<boolean> => {
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
  private mapEntityToAccessModel = (entity: TravelEntity): TravelAccessModel => {
    return new TravelAccessModel(
      entity.id!,
      entity.name,
      entity.createdbyuserid,
      entity.status,
      new Date(entity.datecreated!),
      entity.description || null,
      entity.startdate ? new Date(entity.startdate) : null,
      entity.enddate ? new Date(entity.enddate) : null,
      entity.defaultcurrencyid || null,
      entity.lastupdatedbyuserid || null,
      entity.updatedat ? new Date(entity.updatedat) : null,
      entity.finalizeddate ? new Date(entity.finalizeddate) : null,
    );
  };

  private mapCreateRequestToEntity = (request: CreateTravelAccessRequest): TravelEntity => {
    return new TravelEntity(
      request.name,
      request.createdByUserId,
      TravelStatus.Active,
      request.description,
      request.startDate,
      request.endDate,
      request.defaultCurrencyId,
    );
  };

  private mapUpdateRequestToEntity = (request: UpdateTravelAccessRequest): TravelEntity => {
    const entity = new TravelEntity(
      request.name,
      request.createdByUserId,
      request.status,
      request.description,
      request.startDate,
      request.endDate,
      request.defaultCurrencyId,
      undefined,
      request.lastUpdatedByUserId,
      undefined,
      request.finalizedDate,
    );
    entity.id = request.id;
    return entity;
  };
}