import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
  Inject,
} from '@nestjs/common';
import { CurrentUserService } from '../services/current-user.service';
import { PrivateEndpointGuard } from '../guards/private-endpoint.guard';
import { FinancialInstitutionManagerService } from '../../manager/services/financial-institution-manager.service';
import { FINANCIAL_INSTITUTION_TOKENS } from '../../utility/constants/injection-tokens.const';
import {
  FinancialInstitutionModel,
  CreateFinancialInstitutionRequest,
  UpdateFinancialInstitutionRequest,
} from '../../manager/models/financial-institutions';
import {
  CreateFinancialInstitutionApiRequest,
  UpdateFinancialInstitutionApiRequest,
} from '../models/financial-institutions';
import { MessageModel } from '../models/message.model';

@Controller('financial-institutions')
@UseGuards(PrivateEndpointGuard)
export class FinancialInstitutionsController {
  constructor(
    private readonly currentUserService: CurrentUserService,

    @Inject(FINANCIAL_INSTITUTION_TOKENS.MANAGER_SERVICE)
    private readonly financialInstitutionManagerService: FinancialInstitutionManagerService,
  ) {}

  // ==================== FINANCIAL INSTITUTIONS ====================

  @Get()
  async getAllFinancialInstitutions(): Promise<FinancialInstitutionModel[]> {
    const userId = await this.currentUserService.getCurrentUserId();
    return await this.financialInstitutionManagerService.getAllFinancialInstitutions(userId);
  }

  @Post()
  async createFinancialInstitution(@Body() apiRequest: CreateFinancialInstitutionApiRequest): Promise<FinancialInstitutionModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    const request = new CreateFinancialInstitutionRequest(
      userId,
      apiRequest.name,
      +apiRequest.type,
    );
    return await this.financialInstitutionManagerService.createFinancialInstitution(request);
  }

  @Put(':id')
  async updateFinancialInstitution(
    @Param('id', ParseIntPipe) id: number,
    @Body() apiRequest: UpdateFinancialInstitutionApiRequest,
  ): Promise<FinancialInstitutionModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    const request = new UpdateFinancialInstitutionRequest(
      id,
      userId,
      apiRequest.name,
      +apiRequest.type,
    );
    return await this.financialInstitutionManagerService.updateFinancialInstitution(request);
  }

  @Delete(':id')
  async deleteFinancialInstitution(@Param('id', ParseIntPipe) id: number): Promise<MessageModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    await this.financialInstitutionManagerService.deleteFinancialInstitution(id, userId);
    return new MessageModel('Financial institution deleted successfully');
  }
}
