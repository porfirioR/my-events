import { Injectable } from '@nestjs/common';
import { DatabaseColumns, TableEnum, TravelOperationStatus } from '../../../utility/enums';
import { BaseAccessService, DbContextService } from '.';
import { 
  ITravelOperationAccessService, 
  TravelOperationAccessModel, 
  CreateTravelOperationAccessRequest, 
  UpdateTravelOperationAccessRequest 
} from '../../contract/travels';
import { TravelOperationEntity } from '../entities';

@Injectable()
export class TravelOperationAccessService extends BaseAccessService implements ITravelOperationAccessService {
  constructor(dbContextService: DbContextService) {
    super(dbContextService);
  }

  public create = async (request: CreateTravelOperationAccessRequest): Promise<TravelOperationAccessModel> => {
    const entity = this.mapCreateRequestToEntity(request);

    const { data, error } = await this.dbContext
      .from(TableEnum.TravelOperations)
      .insert(entity)
      .select()
      .single<TravelOperationEntity>();

    if (error) {
      throw new Error(error.message);
    }

    return this.mapEntityToAccessModel(data);
  };

  public getById = async (id: number): Promise<TravelOperationAccessModel | null> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.TravelOperations)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.EntityId, id)
      .single<TravelOperationEntity>();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }

    return this.mapEntityToAccessModel(data);
  };

  public getByTravelId = async (travelId: number): Promise<TravelOperationAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.TravelOperations)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.TravelId, travelId)
      .order(DatabaseColumns.TransactionDate, { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data?.map(this.mapEntityToAccessModel) || [];
  };

  public getByStatus = async (travelId: number, status: string): Promise<TravelOperationAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.TravelOperations)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.TravelId, travelId)
      .eq(DatabaseColumns.Status, status)
      .order(DatabaseColumns.TransactionDate, { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data?.map(this.mapEntityToAccessModel) || [];
  };

  public update = async (request: UpdateTravelOperationAccessRequest): Promise<TravelOperationAccessModel> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.TravelOperations)
      .update({
        currencyid: request.currencyId,
        paymentmethodid: request.paymentMethodId,
        whopaidmemberid: request.whoPaidMemberId,
        amount: request.amount,
        description: request.description,
        splittype: request.splitType,
        transactiondate: request.transactionDate.toISOString(),
        lastupdatedbyuserid: request.lastUpdatedByUserId,
        updatedat: new Date().toISOString(),
      })
      .eq(DatabaseColumns.EntityId, request.id)
      .eq(DatabaseColumns.TravelId, request.travelId)
      .select()
      .single<TravelOperationEntity>();

    if (error) {
      throw new Error(error.message);
    }

    return this.mapEntityToAccessModel(data);
  };

  public updateStatus = async (id: number, status: string): Promise<TravelOperationAccessModel> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.TravelOperations)
      .update({
        status: status,
        updatedat: new Date().toISOString(),
      })
      .eq(DatabaseColumns.EntityId, id)
      .select()
      .single<TravelOperationEntity>();

    if (error) {
      throw new Error(error.message);
    }

    return this.mapEntityToAccessModel(data);
  };

  public delete = async (id: number): Promise<void> => {
    const { error } = await this.dbContext
      .from(TableEnum.TravelOperations)
      .delete()
      .eq(DatabaseColumns.EntityId, id);

    if (error) {
      throw new Error(error.message);
    }
  };

  public areAllApproved = async (travelId: number): Promise<boolean> => {
    // Obtener todas las operaciones del viaje
    const { data: operations, error: opsError } = await this.dbContext
      .from(TableEnum.TravelOperations)
      .select(DatabaseColumns.Status)
      .eq(DatabaseColumns.TravelId, travelId);

    if (opsError) {
      throw new Error(opsError.message);
    }

    if (!operations || operations.length === 0) {
      return false;
    }

    // Verificar que todas estén aprobadas
    return operations.every(op => op.status === TravelOperationStatus.Approved);
  };

  public countByTravelId = async (travelId: number): Promise<number> => {
    const { count, error } = await this.dbContext
      .from(TableEnum.TravelOperations)
      .select(DatabaseColumns.EntityId, { count: 'exact', head: true })
      .eq(DatabaseColumns.TravelId, travelId);

    if (error) {
      throw new Error(error.message);
    }

    return count || 0;
  };

  public getGroupedByCurrency = async (
    travelId: number,
  ): Promise<{ currencyId: number; operations: TravelOperationAccessModel[] }[]> => {
    const operations = await this.getByTravelId(travelId);

    // Agrupar por currencyId
    const grouped = operations.reduce((acc, operation) => {
      const existing = acc.find(g => g.currencyId === operation.currencyId);
      if (existing) {
        existing.operations.push(operation);
      } else {
        acc.push({
          currencyId: operation.currencyId,
          operations: [operation],
        });
      }
      return acc;
    }, [] as { currencyId: number; operations: TravelOperationAccessModel[] }[]);

    return grouped;
  };

  // Private methods
  private mapEntityToAccessModel = (entity: TravelOperationEntity): TravelOperationAccessModel => {
    return new TravelOperationAccessModel(
      entity.id!,
      entity.travelid,
      entity.createdbyuserid,
      entity.currencyid,
      entity.paymentmethodid,
      entity.whopaidmemberid,
      parseFloat(entity.amount.toString()),
      entity.description,
      entity.splittype,
      entity.status,
      new Date(entity.datecreated!),
      new Date(entity.transactiondate!),
      entity.lastupdatedbyuserid || null,
      entity.updatedat ? new Date(entity.updatedat) : null,
    );
  };

  private mapCreateRequestToEntity = (request: CreateTravelOperationAccessRequest): TravelOperationEntity => {
    return new TravelOperationEntity(
      request.travelId,
      request.createdByUserId,
      request.currencyId,
      request.paymentMethodId,
      request.whoPaidMemberId,
      request.amount,
      request.description,
      request.splitType,
      TravelOperationStatus.Pending,
      undefined,
      request.transactionDate,
    );
  };
}