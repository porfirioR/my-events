import { Injectable } from '@nestjs/common';
import { DatabaseColumns, TableEnum } from '../../../utility/enums';
import { BaseAccessService, DbContextService } from '.';
import { PaymentMethodEntity } from '../entities';
import { IPaymentMethodAccessService, PaymentMethodAccessModel } from '../../contract/travels';

@Injectable()
export class PaymentMethodAccessService extends BaseAccessService implements IPaymentMethodAccessService {
  constructor(dbContextService: DbContextService) {
    super(dbContextService);
  }

  public getAll = async (): Promise<PaymentMethodAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.PaymentMethods)
      .select(DatabaseColumns.All)
      .order(DatabaseColumns.EntityId, { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return data?.map(this.mapEntityToAccessModel) || [];
  };

  public getById = async (id: number): Promise<PaymentMethodAccessModel | null> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.PaymentMethods)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.EntityId, id)
      .single<PaymentMethodEntity>();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }

    return this.mapEntityToAccessModel(data);
  };

  // Private methods
  private mapEntityToAccessModel = (entity: PaymentMethodEntity): PaymentMethodAccessModel => {
    return new PaymentMethodAccessModel(
      entity.id!,
      entity.name,
      new Date(entity.datecreated!),
    );
  };
}