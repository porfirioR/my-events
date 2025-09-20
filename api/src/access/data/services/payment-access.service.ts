import { Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { DatabaseColumns, TableEnum } from '../../../utility/enums';
import { DbContextService } from './db-context.service';
import { CreatePaymentAccessRequest, PaymentAccessModel, UpdatePaymentAccessRequest } from '../../../access/contract/payments';
import { PaymentEntity } from '../entities/payment.entity';

@Injectable()
export class PaymentAccessService {
  private eventContext: SupabaseClient<any, 'public', any>;

  constructor(private dbContextService: DbContextService) {
    this.eventContext = this.dbContextService.getConnection();
  }

  public create = async (accessRequest: CreatePaymentAccessRequest): Promise<PaymentAccessModel> => {
    const eventEntity = this.mapAccessRequestToEntity(accessRequest);
    const event  = await this.eventContext
      .from(TableEnum.Payments)
      .insert(eventEntity)
      .select()
      .single<PaymentEntity>();
    if (event.error) throw new Error(event.error.message);
    return this.mapEntityToAccessModel(event.data);
  };

  public getMyPayments = async (authorId: number, id: number): Promise<PaymentAccessModel[]> => {
    const { data, error } = await this.eventContext
      .from(TableEnum.Payments)
      .select(DatabaseColumns.All)
      .eq(DatabaseColumns.AuthorId, authorId)
      .eq(DatabaseColumns.EntityId, id)
      .order('date', {ascending: false});
    if (error) throw new Error(error.message);
    return data?.map(this.mapEntityToAccessModel);
  };

  public updatePayment = async (accessRequest: UpdatePaymentAccessRequest): Promise<PaymentAccessModel> => {
    const eventEntity = this.mapAccessRequestToEntity(accessRequest);
    const event = await this.eventContext
      .from(TableEnum.Payments)
      .upsert(eventEntity)
      .select()
      .single<PaymentEntity>();
    if (event.error) throw new Error(event.error.message);
    return this.mapEntityToAccessModel(event.data);
  };

  private mapEntityToAccessModel = (entity: PaymentEntity): PaymentAccessModel => new PaymentAccessModel(
    entity.id,
    entity.amount,
    entity.date,
    entity.refund,
    entity.savingid
  );

  private mapAccessRequestToEntity = (accessRequest: CreatePaymentAccessRequest | UpdatePaymentAccessRequest): PaymentEntity => {
    const paymentEntity = new PaymentEntity(
      accessRequest.date,
      accessRequest.savingId,
      accessRequest.amount,
      accessRequest.refund
    );
    if (accessRequest instanceof UpdatePaymentAccessRequest) {
      paymentEntity.id = accessRequest.id
    }
    return paymentEntity
  };

}
