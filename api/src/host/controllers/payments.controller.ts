import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { CreatePaymentApiRequest } from '../models/payments/create-payment-api-request';
import { PaymentModel } from '../../manager/models/payments/payment-model';
import { UpdatePaymentApiRequest } from '../models/payments/update-payment-api-request';
import { PrivateEndpointGuard } from '../guards/private-endpoint.guard';
import { PaymentManagerService } from '../../manager/services';
import { CreatePaymentRequest } from '../../manager/models/payments/create-payment-request';
import { UpdatePaymentRequest } from '../../manager/models/payments/update-payment-request';

@Controller('payments')
@UseGuards(PrivateEndpointGuard)
export class PaymentController {
  constructor(private paymentManagerService: PaymentManagerService) {}

  @Get(':authorId/:id')
  async getMyPayments(@Param('authorId') authorId: number, @Param('id') id: number): Promise<PaymentModel[]> {
    return await this.paymentManagerService.getMyPayments(authorId, id);
  }

  @Post()
  async createPayment(@Body() apiRequest: CreatePaymentApiRequest): Promise<PaymentModel> {
    const request = new CreatePaymentRequest(apiRequest.date, apiRequest.savingId, apiRequest.amount, apiRequest.refund);
    return await this.paymentManagerService.createPayment(request);
  }

  @Put()
  async updatePayment(@Body() apiRequest: UpdatePaymentApiRequest): Promise<PaymentModel> {
    const request = new UpdatePaymentRequest(apiRequest.id, apiRequest.date, apiRequest.savingId, apiRequest.amount, apiRequest.refund)
    return await this.paymentManagerService.updatePayment(request);
  }
}
