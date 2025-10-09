import { Injectable } from '@nestjs/common';
import { TableEnum, DatabaseColumns } from '../../../utility/enums';
import { BaseAccessService, DbContextService } from '.';
import { CreateTransactionSplitAccessRequest, ITransactionSplitAccessService, TransactionSplitAccessModel } from 'src/access/contract/transactions';
import { TransactionSplitEntity } from '../entities';

@Injectable()
export class TransactionSplitAccessService extends BaseAccessService implements ITransactionSplitAccessService {
  constructor(dbContextService: DbContextService) {
    super(dbContextService);
  }

  public create = async (request: CreateTransactionSplitAccessRequest): Promise<TransactionSplitAccessModel> => {
    const entity = this.getEntity(request);

    const { data, error } = await this.dbContext
      .from(TableEnum.TransactionSplits)
      .insert(entity)
      .select()
      .single<TransactionSplitEntity>();

    if (error) {
      throw new Error(error.message);
    }

    return this.getAccessModel(data);
  };

  public getByTransaction = async (transactionId: number): Promise<TransactionSplitAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.TransactionSplits)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.TransactionId, transactionId);

    if (error) {
      throw new Error(error.message);
    }

    return data?.map(this.getAccessModel) || [];
  };

  public getByCollaborator = async (
    collaboratorId: number,
    isSettled?: boolean,
  ): Promise<TransactionSplitAccessModel[]> => {
    let query = this.dbContext
      .from(TableEnum.TransactionSplits)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.CollaboratorId, collaboratorId);

    if (isSettled !== undefined) {
      query = query.eq(DatabaseColumns.IsSettled, isSettled);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return data?.map(this.getAccessModel) || [];
  };

  public getByUser = async (userId: number, isSettled?: boolean): Promise<TransactionSplitAccessModel[]> => {
    let query = this.dbContext
      .from(TableEnum.TransactionSplits)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.UserId, userId);

    if (isSettled !== undefined) {
      query = query.eq(DatabaseColumns.IsSettled, isSettled);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return data?.map(this.getAccessModel) || [];
  };

  public hasUnsettledSplits = async (transactionId: number): Promise<boolean> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.TransactionSplits)
      .select('id')
      .eq(DatabaseColumns.TransactionId, transactionId)
      .eq(DatabaseColumns.IsSettled, false)
      .limit(1);

    if (error) {
      throw new Error(error.message);
    }

    return (data?.length || 0) > 0;
  };

  public markAsSettled = async (id: number): Promise<void> => {
    const { error } = await this.dbContext
      .from(TableEnum.TransactionSplits)
      .update({ issettled: true })
      .eq(DatabaseColumns.EntityId, id);

    if (error) {
      throw new Error(error.message);
    }
  };

  public delete = async (id: number): Promise<void> => {
    const { error } = await this.dbContext
      .from(TableEnum.TransactionSplits)
      .delete()
      .eq(DatabaseColumns.EntityId, id);

    if (error) {
      throw new Error(error.message);
    }
  };

  // Mappers privados
  private getAccessModel = (data: any): TransactionSplitAccessModel => {
    return new TransactionSplitAccessModel(
      data.id,
      data.transactionid,
      data.collaboratorid,
      data.userid,
      parseFloat(data.amount),
      data.sharepercentage ? parseFloat(data.sharepercentage) : null,
      data.ispayer,
      data.issettled,
    );
  };

  private getEntity = (request: CreateTransactionSplitAccessRequest): TransactionSplitEntity => {
    return new TransactionSplitEntity(
      request.transactionId,
      request.collaboratorId,
      request.userId,
      request.amount,
      request.sharePercentage,
      request.isPayer,
      false, // issettled siempre false al crear
    );
  };
}