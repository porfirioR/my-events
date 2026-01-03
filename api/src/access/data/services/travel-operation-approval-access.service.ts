import { Injectable } from '@nestjs/common';
import { DatabaseColumns, TableEnum, ApprovalStatus } from '../../../utility/enums';
import { BaseAccessService, DbContextService } from '.';
import { 
  ITravelOperationApprovalAccessService, 
  TravelOperationApprovalAccessModel, 
  CreateApprovalAccessRequest 
} from '../../contract/travels';
import { TravelOperationApprovalEntity } from '../entities';

@Injectable()
export class TravelOperationApprovalAccessService 
  extends BaseAccessService 
  implements ITravelOperationApprovalAccessService 
{
  constructor(dbContextService: DbContextService) {
    super(dbContextService);
  }

  public create = async (request: CreateApprovalAccessRequest): Promise<TravelOperationApprovalAccessModel> => {
    const entity = this.mapRequestToEntity(request);

    const { data, error } = await this.dbContext
      .from(TableEnum.TravelOperationApprovals)
      .insert(entity)
      .select()
      .single<TravelOperationApprovalEntity>();

    if (error) {
      throw new Error(error.message);
    }

    return this.mapEntityToAccessModel(data);
  };

  public createMultiple = async (
    requests: CreateApprovalAccessRequest[],
  ): Promise<TravelOperationApprovalAccessModel[]> => {
    const entities = requests.map(this.mapRequestToEntity);

    const { data, error } = await this.dbContext
      .from(TableEnum.TravelOperationApprovals)
      .insert(entities)
      .select();

    if (error) {
      throw new Error(error.message);
    }

    return data?.map(this.mapEntityToAccessModel) || [];
  };

  public getByOperationId = async (operationId: number): Promise<TravelOperationApprovalAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.TravelOperationApprovals)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.OperationId, operationId);

    if (error) {
      throw new Error(error.message);
    }

    return data?.map(this.mapEntityToAccessModel) || [];
  };

  public getByOperationAndMember = async (
    operationId: number,
    memberId: number,
  ): Promise<TravelOperationApprovalAccessModel | null> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.TravelOperationApprovals)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.OperationId, operationId)
      .eq(DatabaseColumns.MemberId, memberId)
      .single<TravelOperationApprovalEntity>();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }

    return this.mapEntityToAccessModel(data);
  };

  public approve = async (operationId: number, memberId: number): Promise<TravelOperationApprovalAccessModel> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.TravelOperationApprovals)
      .update({
        status: ApprovalStatus.Approved,
        approvaldate: new Date().toISOString(),
      })
      .eq(DatabaseColumns.OperationId, operationId)
      .eq(DatabaseColumns.MemberId, memberId)
      .select()
      .single<TravelOperationApprovalEntity>();

    if (error) {
      throw new Error(error.message);
    }

    return this.mapEntityToAccessModel(data);
  };

  public reject = async (
    operationId: number,
    memberId: number,
    rejectionReason: string,
  ): Promise<TravelOperationApprovalAccessModel> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.TravelOperationApprovals)
      .update({
        status: ApprovalStatus.Rejected,
        rejectionreason: rejectionReason,
        approvaldate: new Date().toISOString(),
      })
      .eq(DatabaseColumns.OperationId, operationId)
      .eq(DatabaseColumns.MemberId, memberId)
      .select()
      .single<TravelOperationApprovalEntity>();

    if (error) {
      throw new Error(error.message);
    }

    return this.mapEntityToAccessModel(data);
  };

  public delete = async (id: number): Promise<void> => {
    const { error } = await this.dbContext
      .from(TableEnum.TravelOperationApprovals)
      .delete()
      .eq(DatabaseColumns.EntityId, id);

    if (error) {
      throw new Error(error.message);
    }
  };

  public deleteAllByOperationId = async (operationId: number): Promise<void> => {
    const { error } = await this.dbContext
      .from(TableEnum.TravelOperationApprovals)
      .delete()
      .eq(DatabaseColumns.OperationId, operationId);

    if (error) {
      throw new Error(error.message);
    }
  };

  public isFullyApproved = async (operationId: number): Promise<boolean> => {
    // Obtener todas las aprobaciones de la operación
    const approvals = await this.getByOperationId(operationId);

    if (approvals.length === 0) {
      return false;
    }

    // Verificar que todas estén aprobadas
    return approvals.every(approval => approval.status === ApprovalStatus.Approved);
  };

  public hasRejections = async (operationId: number): Promise<boolean> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.TravelOperationApprovals)
      .select(DatabaseColumns.EntityId)
      .eq(DatabaseColumns.OperationId, operationId)
      .eq(DatabaseColumns.Status, ApprovalStatus.Rejected)
      .limit(1);

    if (error) {
      throw new Error(error.message);
    }

    return (data?.length || 0) > 0;
  };

  public getPendingCount = async (operationId: number): Promise<number> => {
    const { count, error } = await this.dbContext
      .from(TableEnum.TravelOperationApprovals)
      .select(DatabaseColumns.EntityId, { count: 'exact', head: true })
      .eq(DatabaseColumns.OperationId, operationId)
      .eq(DatabaseColumns.Status, ApprovalStatus.Pending);

    if (error) {
      throw new Error(error.message);
    }

    return count || 0;
  };

  public getTotalCount = async (operationId: number): Promise<number> => {
    const { count, error } = await this.dbContext
      .from(TableEnum.TravelOperationApprovals)
      .select(DatabaseColumns.EntityId, { count: 'exact', head: true })
      .eq(DatabaseColumns.OperationId, operationId);

    if (error) {
      throw new Error(error.message);
    }

    return count || 0;
  };

  // Private methods
  private mapEntityToAccessModel = (entity: TravelOperationApprovalEntity): TravelOperationApprovalAccessModel => {
    return new TravelOperationApprovalAccessModel(
      entity.id!,
      entity.operationid,
      entity.memberid,
      entity.status,
      entity.approvaldate ? new Date(entity.approvaldate) : null,
      entity.rejectionreason || null,
    );
  };

  private mapRequestToEntity = (request: CreateApprovalAccessRequest): TravelOperationApprovalEntity => {
    return new TravelOperationApprovalEntity(
      request.operationId,
      request.memberId,
      request.status,
    );
  };
}