import { Injectable } from '@nestjs/common';
import { PaymentModel } from '../models/payments/payment-model';
import { PaymentAccessModel } from '../../access/contract/payments/payment-access-model';
import { CreatePaymentAccessRequest } from '../../access/contract/payments/create-payment-access-request';
import { UpdatePaymentAccessRequest } from '../../access/contract/payments/update-payment-access-request';
import { CreatePaymentRequest } from '../models/payments/create-payment-request';
import { UpdatePaymentRequest } from '../models/payments/update-payment-request';
import { PaymentAccessService } from '../../access/data/services/payment-access.service';

@Injectable()
export class PaymentManagerService {

  constructor(
    private readonly paymentAccessService: PaymentAccessService
  ) { }

  public getMyPayments = async (authorId: number, id: number): Promise<PaymentModel[]> => {
    const accessModelList = await this.paymentAccessService.getMyPayments(authorId, id);
    return accessModelList.map(this.mapAccessModelToModel)
  }

  public createPayment = async (request: CreatePaymentRequest): Promise<PaymentModel> => {
    const accessRequest = new CreatePaymentAccessRequest(
      request.date,
      request.savingId,
      request.amount,
      request.refund
    )
    const accessModel = await this.paymentAccessService.create(accessRequest);
    return this.mapAccessModelToModel(accessModel)
  }

  public updatePayment = async (request: UpdatePaymentRequest): Promise<PaymentModel> => {
    const accessRequest = new UpdatePaymentAccessRequest(
      request.id,
      request.date,
      request.savingId,
      request.amount,
      request.refund
    )
    const accessModel = await this.paymentAccessService.updatePayment(accessRequest);
    return this.mapAccessModelToModel(accessModel)
  }

  private mapAccessModelToModel = (accessModel: PaymentAccessModel) => new PaymentModel(
    accessModel.id,
    accessModel.amount,
    accessModel.date,
    accessModel.refund,
    accessModel.savingId
  )

}
