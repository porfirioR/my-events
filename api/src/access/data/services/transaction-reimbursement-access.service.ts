import { Injectable } from '@nestjs/common';
import { TableEnum, DatabaseColumns } from '../../../utility/enums';
import { BaseAccessService, DbContextService } from '.';
import { CreateTransactionReimbursementAccessRequest, ITransactionReimbursementAccessService, TransactionReimbursementAccessModel } from '../../../access/contract/transactions';
import { TransactionReimbursementEntity } from '../entities';

@Injectable()
export class TransactionReimbursementAccessService
  extends BaseAccessService
  implements ITransactionReimbursementAccessService
{
  constructor(dbContextService: DbContextService) {
    super(dbContextService);
  }

  public create = async (
    request: CreateTransactionReimbursementAccessRequest,
  ): Promise<TransactionReimbursementAccessModel> => {
    const entity = this.getEntity(request);

    const { data, error } = await this.dbContext
      .from(TableEnum.TransactionReimbursements)
      .insert(entity)
      .select()
      .single<TransactionReimbursementEntity>();

    if (error) {
      throw new Error(error.message);
    }

    return this.getAccessModel(data);
  };

  public getByTransaction = async (transactionId: number): Promise<TransactionReimbursementAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.TransactionReimbursements)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.TransactionId, transactionId)
      .order(DatabaseColumns.ReimbursementDate, { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return data?.map(this.getAccessModel) || [];
  };

  public getTotalByTransaction = async (transactionId: number): Promise<number> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.TransactionReimbursements)
      .select('amount')
      .eq(DatabaseColumns.TransactionId, transactionId);

    if (error) {
      throw new Error(error.message);
    }

    const total = data?.reduce((sum, item) => sum + parseFloat(item.amount), 0) || 0;
    return total;
  };

  public delete = async (id: number): Promise<void> => {
    const { error } = await this.dbContext
      .from(TableEnum.TransactionReimbursements)
      .delete()
      .eq(DatabaseColumns.EntityId, id);

    if (error) {
      throw new Error(error.message);
    }
  };

  // Mappers privados
  private getAccessModel = (data: any): TransactionReimbursementAccessModel => {
    return new TransactionReimbursementAccessModel(
      data.id,
      data.transactionid,
      parseFloat(data.amount),
      data.description,
      new Date(data.reimbursementdate),
    );
  };

  private getEntity = (request: CreateTransactionReimbursementAccessRequest): TransactionReimbursementEntity => {
    return new TransactionReimbursementEntity(request.transactionId, request.amount, request.description);
  };
}