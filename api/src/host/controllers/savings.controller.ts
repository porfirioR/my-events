import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { CreateSavingApiRequest } from '../models/savings/create-saving-api-request';
import { SavingModel } from '../../manager/models/savings/savings-goal-model';
import { PrivateEndpointGuard } from '../guards/private-endpoint.guard';
import { SavingsManagerService } from '../../manager/services';
import { CreateSavingRequest } from '../../manager/models/savings/create-savings-goal-request';
import { UpdateSavingRequest } from '../../manager/models/savings/update-savings-goal-request';
import { UpdateSavingApiRequest } from '../models/savings/update-saving-api-request';

@Controller('savings')
@UseGuards(PrivateEndpointGuard)
export class SavingsController {
  constructor(private savingManagerService: SavingsManagerService) {}

  @Get(':authorId/:id')
  async getMySavings(@Param('authorId') authorId: number, @Param('id') id: number): Promise<SavingModel[]> {
    return await this.savingManagerService.getMySavings(authorId, id);
  }

  @Post()
  async createSavings(@Body() apiRequest: CreateSavingApiRequest): Promise<SavingModel> {
    const request = new CreateSavingRequest(
      apiRequest.name,
      apiRequest.description,
      apiRequest.date,
      apiRequest.savingTypeId,
      apiRequest.currencyId,
      apiRequest.userId,
      apiRequest.periodId,
      apiRequest.totalAmount,
      apiRequest.numberOfPayment,
      apiRequest.customPeriodQuantity
    );
    return await this.savingManagerService.createSaving(request);
  }

  @Put()
  async updateSavings(@Body() apiRequest: UpdateSavingApiRequest): Promise<SavingModel> {
    const request = new UpdateSavingRequest(
      apiRequest.id,
      apiRequest.name,
      apiRequest.description,
      apiRequest.isActive,
      apiRequest.date,
      apiRequest.savingTypeId,
      apiRequest.currencyId,
      apiRequest.userId,
      apiRequest.periodId,
      apiRequest.totalAmount,
      apiRequest.numberOfPayment,
      apiRequest.customPeriodQuantity
    )
    return await this.savingManagerService.updateSaving(request);
  }
}
