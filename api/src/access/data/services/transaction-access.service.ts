import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { TableEnum, DatabaseColumns } from '../../../utility/enums';
import { BaseAccessService, DbContextService } from '.';
import { TransactionEntity } from '../entities';
import { CreateTransactionAccessRequest, ITransactionAccessService, TransactionAccessModel, UpdateTransactionAccessRequest, UpdateTransactionReimbursementTotalAccessRequest } from '../../../access/contract/transactions';

@Injectable()
export class TransactionAccessService extends BaseAccessService implements ITransactionAccessService {
  constructor(dbContextService: DbContextService) {
    super(dbContextService);
  }

  public create = async (request: CreateTransactionAccessRequest): Promise<TransactionAccessModel> => {
    const entity = this.getEntity(request);

    const { data, error } = await this.dbContext
      .from(TableEnum.Transactions)
      .insert(entity)
      .select()
      .single<TransactionEntity>();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return this.getAccessModel(data);
  };

  public getById = async (id: number): Promise<TransactionAccessModel | null> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.Transactions)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.EntityId, id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new InternalServerErrorException(error.message);
    }

    return this.getAccessModel(data);
  };

  public getByUserId = async (userId: number): Promise<TransactionAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.Transactions)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.UserId, userId)
      .order(DatabaseColumns.TransactionDate, { ascending: true });

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return data?.map(this.getAccessModel) || [];
  };

  public getByUserAndCollaborator = async (
    userId: number,
    collaboratorId: number,
  ): Promise<TransactionAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.Transactions)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.UserId, userId)
      .eq(DatabaseColumns.CollaboratorId, collaboratorId)
      .order(DatabaseColumns.TransactionDate, { ascending: true });

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return data?.map(this.getAccessModel) || [];
  };

  public update = async (request: UpdateTransactionAccessRequest): Promise<TransactionAccessModel> => {
    // Función de Postgres: todo se aplica en una sola transacción de base (ver db.sql, Parte 18)
    const { data, error } = await this.dbContext
      .rpc('update_transaction_with_splits', {
        p_transaction_id: request.id,
        p_collaborator_id: request.collaboratorId,
        p_total_amount: request.totalAmount,
        p_description: request.description,
        p_split_type: request.splitType,
        p_who_paid: request.whoPaid,
        p_transaction_date: request.transactionDate,
        p_replace_reimbursement: request.replaceReimbursement,
        p_reimbursement_amount: request.reimbursementAmount,
        p_reimbursement_description: request.reimbursementDescription,
        p_splits: request.splits.map(x => ({
          collaboratorid: x.collaboratorId,
          userid: x.userId,
          amount: x.amount,
          sharepercentage: x.sharePercentage,
          ispayer: x.isPayer,
        })),
      })
      .single<TransactionEntity>();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return this.getAccessModel(data);
  };

  public updateReimbursementTotal = async (
    request: UpdateTransactionReimbursementTotalAccessRequest,
  ): Promise<void> => {
    const { error } = await this.dbContext
      .from(TableEnum.Transactions)
      .update({ totalreimbursement: request.totalReimbursement })
      .eq(DatabaseColumns.EntityId, request.transactionId);

    if (error) {
      throw new InternalServerErrorException(error.message);
    }
  };

  public delete = async (id: number): Promise<void> => {
    const { error } = await this.dbContext
      .from(TableEnum.Transactions)
      .delete()
      .eq(DatabaseColumns.EntityId, id);

    if (error) {
      throw new InternalServerErrorException(error.message);
    }
  };

  // Mappers privados
  private getAccessModel = (data: any): TransactionAccessModel => {
    return new TransactionAccessModel(
      data.id,
      data.userid,
      data.collaboratorid,
      parseFloat(data.totalamount),
      data.description,
      data.splittype,
      data.whopaid,
      parseFloat(data.totalreimbursement),
      parseFloat(data.netamount),
      new Date(data.transactiondate),
    );
  };

  private getEntity = (request: CreateTransactionAccessRequest): TransactionEntity => {
    return new TransactionEntity(
      request.userId,
      request.collaboratorId,
      request.totalAmount,
      request.description,
      request.splitType,
      request.whoPaid,
      request.totalReimbursement,
      request.transactionDate ?? undefined,
    );
  };
}