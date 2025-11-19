import { Injectable } from '@nestjs/common';
import { SavingModel } from '../models/savings/saving-model';
import { SavingsGoalAccessModel } from '../../access/contract/savings/savings-goal-access.model';
import { CreateSavingsGoalAccessRequest } from '../../access/contract/savings/create-savings-goal-access-request';
import { UpdateSavingsGoalAccessRequest } from '../../access/contract/savings/update-savings-goal-access-request';
import { SavingAccessService } from '../../access/data/services/savings-goal-access.service';
import { CreateSavingRequest } from '../models/savings/create-saving-request';
import { UpdateSavingRequest } from '../models/savings/update-saving-request';

@Injectable()
export class SavingsManagerService {

  constructor(
    private readonly savingAccessService: SavingAccessService
  ) { }

  public getMySavings = async (authorId: number, id: number): Promise<SavingModel[]> => {
    const accessModelList = await this.savingAccessService.getMySavings(authorId, id);
    return accessModelList.map(this.mapAccessModelToModel)
  }

  public createSaving = async (request: CreateSavingRequest): Promise<SavingModel> => {
    const accessRequest = new CreateSavingsGoalAccessRequest(
      request.name,
      request.description,
      request.date,
      request.savingTypeId,
      request.currencyId,
      request.userId,
      request.periodId,
      request.totalAmount,
      request.numberOfPayment,
      request.customPeriodQuantity
    )
    const accessModel = await this.savingAccessService.create(accessRequest);
    return this.mapAccessModelToModel(accessModel)
  }

  public updateSaving = async (request: UpdateSavingRequest): Promise<SavingModel> => {
    const accessRequest = new UpdateSavingsGoalAccessRequest(
      request.id,
      request.isActive,
      request.name,
      request.description,
      request.date,
      request.savingTypeId,
      request.currencyId,
      request.userId,
      request.periodId,
      request.totalAmount,
      request.numberOfPayment,
      request.customPeriodQuantity
    )
    const accessModel = await this.savingAccessService.updateSaving(accessRequest);
    return this.mapAccessModelToModel(accessModel)
  }

  private mapAccessModelToModel = (accessModel: SavingsGoalAccessModel) => new SavingModel(
    accessModel.id,
    accessModel.isActive,
    accessModel.name,
    accessModel.description,
    accessModel.date,
    accessModel.savingTypeId,
    accessModel.currencyId,
    accessModel.userId,
    accessModel.periodId,
    accessModel.totalAmount,
    accessModel.numberOfPayment,
    accessModel.customPeriodQuantity
  )

}
