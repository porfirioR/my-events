// operation-attachment-access.service.ts
import { Injectable } from '@nestjs/common';
import { DatabaseColumns, TableEnum } from '../../../utility/enums';
import { BaseAccessService, DbContextService } from '.';
import { 
  IOperationAttachmentAccessService, 
  OperationAttachmentAccessModel,
  CreateOperationAttachmentAccessRequest 
} from '../../contract/travels';
import { OperationAttachmentEntity } from '../entities';

@Injectable()
export class OperationAttachmentAccessService extends BaseAccessService implements IOperationAttachmentAccessService {
  constructor(dbContextService: DbContextService) {
    super(dbContextService);
  }

  public create = async (request: CreateOperationAttachmentAccessRequest): Promise<OperationAttachmentAccessModel> => {
    const entity = this.mapRequestToEntity(request);

    const { data, error } = await this.dbContext
      .from(TableEnum.OperationAttachments)
      .insert(entity)
      .select()
      .single<OperationAttachmentEntity>();

    if (error) {
      throw new Error(error.message);
    }

    return this.mapEntityToAccessModel(data);
  };

  public getByOperationId = async (operationId: number): Promise<OperationAttachmentAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.OperationAttachments)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.OperationId, operationId)
      .order(DatabaseColumns.UploadedDate, { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return data?.map(this.mapEntityToAccessModel) || [];
  };

  public getById = async (id: number): Promise<OperationAttachmentAccessModel | null> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.OperationAttachments)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.EntityId, id)
      .single<OperationAttachmentEntity>();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }

    return this.mapEntityToAccessModel(data);
  };

  public delete = async (id: number): Promise<void> => {
    const { error } = await this.dbContext
      .from(TableEnum.OperationAttachments)
      .delete()
      .eq(DatabaseColumns.EntityId, id);

    if (error) {
      throw new Error(error.message);
    }
  };

  public deleteAllByOperationId = async (operationId: number): Promise<void> => {
    const { error } = await this.dbContext
      .from(TableEnum.OperationAttachments)
      .delete()
      .eq(DatabaseColumns.OperationId, operationId);

    if (error) {
      throw new Error(error.message);
    }
  };

  public countByOperationId = async (operationId: number): Promise<number> => {
    const { count, error } = await this.dbContext
      .from(TableEnum.OperationAttachments)
      .select(DatabaseColumns.EntityId, { count: 'exact', head: true })
      .eq(DatabaseColumns.OperationId, operationId);

    if (error) {
      throw new Error(error.message);
    }

    return count || 0;
  };

  private mapEntityToAccessModel = (entity: OperationAttachmentEntity): OperationAttachmentAccessModel => {
    return new OperationAttachmentAccessModel(
      entity.id,
      entity.operationid,
      entity.externalid,
      entity.storageurl,
      entity.originalfilename,
      entity.uploadedbyuserid,
      entity.filesize || null,
      new Date(entity.uploadeddate),
    );
  };

  private mapRequestToEntity = (request: CreateOperationAttachmentAccessRequest): OperationAttachmentEntity => {
    return new OperationAttachmentEntity(
      request.operationId,
      request.externalId,
      request.storageUrl,
      request.originalFilename,
      request.uploadedByUserId,
      request.fileSize,
    );
  };
}