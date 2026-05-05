import { Injectable, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(TravelAccessService.name);

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

  
  async getAllByUserIdIncludingMemberships(userId: number): Promise<TravelAccessModel[]> {
    // Intentar usar RPC primero
    const { data: rpcData, error: rpcError } = await this.dbContext
      .rpc('get_user_travels_with_memberships', { 
        user_id: userId 
      });

    if (!rpcError && rpcData) {
      // RPC funcionó, mapear los resultados
      return rpcData.map((item: any) => this.mapEntityToAccessModel(item));
    }

    // Fallback si RPC no está disponible
    this.logger.warn('RPC not available, using fallback method:', rpcError);
    return await this.getAllByUserIdFallback(userId);
  }

  // Private methods
  private getAllByUserIdFallback = async (userId: number): Promise<TravelAccessModel[]> => {
    // Query 1: Viajes creados por el usuario
    const { data: createdTravels, error: createdError } = await this.dbContext
      .from(TableEnum.Travels)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.CreatedByUserId, userId);

    if (createdError) {
      throw new Error(createdError.message);
    }

    // Query 2: IDs de viajes donde el usuario es miembro
    const { data: memberTravelIds, error: memberError } = await this.dbContext
      .from(TableEnum.TravelMembers)
      .select(DatabaseColumns.TravelId)
      .eq(DatabaseColumns.UserId, userId);

    if (memberError) {
      throw new Error(memberError.message);
    }

    // Query 3: Viajes donde es miembro (si hay alguno)
    let memberTravels: TravelEntity[] = [];
    if (memberTravelIds && memberTravelIds.length > 0) {
      const travelIds = memberTravelIds.map(m => m.travelid); // ✅ Usar nombre correcto de columna

      const { data: travels, error: travelsError } = await this.dbContext
        .from(TableEnum.Travels)
        .select(DatabaseColumns.All)
        .in(DatabaseColumns.EntityId, travelIds);

      if (travelsError) {
        throw new Error(travelsError.message);
      }

      memberTravels = travels || [];
    }

    // Combinar y eliminar duplicados
    const allTravels = [
      ...(createdTravels || []),
      ...memberTravels
    ];

    // Eliminar duplicados por ID
    const uniqueTravels = allTravels.filter((travel, index, self) => 
      index === self.findIndex(t => t.id === travel.id)
    );

    // Ordenar por fecha
    uniqueTravels.sort((a, b) => {
      const dateA = new Date(a.updatedat || a.datecreated || 0);
      const dateB = new Date(b.updatedat || b.datecreated || 0);
      return dateB.getTime() - dateA.getTime();
    });

    return uniqueTravels.map(this.mapEntityToAccessModel);
  };

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