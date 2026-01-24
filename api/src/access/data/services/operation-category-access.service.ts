import { Injectable } from '@nestjs/common';
import { DatabaseColumns, TableEnum } from '../../../utility/enums';
import { BaseAccessService, DbContextService } from '.';
import { IOperationCategoryAccessService, OperationCategoryAccessModel } from '../../contract/travels';
import { OperationCategoryEntity } from '../entities';

@Injectable()
export class OperationCategoryAccessService extends BaseAccessService implements IOperationCategoryAccessService {
  constructor(dbContextService: DbContextService) {
    super(dbContextService);
  }

  public getAll = async (): Promise<OperationCategoryAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.OperationCategories)
      .select(DatabaseColumns.All)
      .order(DatabaseColumns.Name, { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return data?.map(this.mapEntityToAccessModel) || [];
  };

  public getById = async (id: number): Promise<OperationCategoryAccessModel | null> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.OperationCategories)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.EntityId, id)
      .single<OperationCategoryEntity>();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }

    return this.mapEntityToAccessModel(data);
  };

  public getActive = async (): Promise<OperationCategoryAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.OperationCategories)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.IsActive, true)
      .order(DatabaseColumns.Name, { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return data?.map(this.mapEntityToAccessModel) || [];
  };

  private mapEntityToAccessModel = (entity: OperationCategoryEntity): OperationCategoryAccessModel => {
    return new OperationCategoryAccessModel(
      entity.id,
      entity.name,
      entity.icon,
      entity.color,
      entity.isactive,
      new Date(entity.datecreated),
    );
  };
}