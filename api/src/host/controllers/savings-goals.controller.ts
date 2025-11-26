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
} from '@nestjs/common';
import { CurrentUserService } from '../services/current-user.service';
import { PrivateEndpointGuard } from '../guards/private-endpoint.guard';
import { SavingsManagerService } from '../../manager/services';
import {
  SavingsGoalModel,
  SavingsInstallmentModel,
  SavingsDepositModel,
  CreateSavingsGoalRequest,
  UpdateSavingsGoalRequest,
  PayInstallmentRequest,
  CreateFreeFormDepositRequest,
  AddInstallmentsRequest,
} from '../../manager/models/savings';
import {
  CreateSavingsGoalApiRequest,
  UpdateSavingsGoalApiRequest,
  PayInstallmentApiRequest,
  CreateFreeFormDepositApiRequest,
  AddInstallmentsApiRequest,
} from '../models/savings';
import { MessageModel } from '../models/message.model';

@Controller('savings-goals')
@UseGuards(PrivateEndpointGuard)
export class SavingsGoalsController {
  constructor(
    private readonly currentUserService: CurrentUserService,
    private readonly savingsManagerService: SavingsManagerService,
  ) {}

  // ==================== GOALS ====================

  /**
   * Obtener todos los objetivos de ahorro del usuario
   * GET /api/savings-goals
   */
  @Get()
  async getAllSavingsGoals(): Promise<SavingsGoalModel[]> {
    const userId = await this.currentUserService.getCurrentUserId();
    return await this.savingsManagerService.getAllSavingsGoals(userId);
  }

  /**
   * Obtener objetivo de ahorro por ID
   * GET /api/savings-goals/:id
   */
  @Get(':id')
  async getSavingsGoalById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SavingsGoalModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    return await this.savingsManagerService.getSavingsGoalById(id, userId);
  }

  /**
   * Obtener objetivos de ahorro por estado
   * GET /api/savings-goals/status/:statusId
   */
  @Get('status/:statusId')
  async getSavingsGoalsByStatus(
    @Param('statusId', ParseIntPipe) statusId: number,
  ): Promise<SavingsGoalModel[]> {
    const userId = await this.currentUserService.getCurrentUserId();
    return await this.savingsManagerService.getSavingsGoalsByStatus(userId, statusId);
  }

  /**
   * Obtener estadísticas de objetivos de ahorro
   * GET /api/savings-goals/stats
   */
  @Get('stats')
  async getSavingsGoalStats() {
    const userId = await this.currentUserService.getCurrentUserId();
    return await this.savingsManagerService.getSavingsGoalStats(userId);
  }

  /**
   * Crear nuevo objetivo de ahorro
   * POST /api/savings-goals
   */
  @Post()
  async createSavingsGoal(
    @Body() apiRequest: CreateSavingsGoalApiRequest,
  ): Promise<SavingsGoalModel> {
    const userId = await this.currentUserService.getCurrentUserId();

    const request = new CreateSavingsGoalRequest(
      userId,
      apiRequest.currencyId,
      apiRequest.name,
      apiRequest.progressionTypeId,
      new Date(apiRequest.startDate),
      apiRequest.description,
      apiRequest.targetAmount,
      apiRequest.numberOfInstallments,
      apiRequest.baseAmount,
      apiRequest.incrementAmount,
      apiRequest.expectedEndDate ? new Date(apiRequest.expectedEndDate) : null,
    );

    return await this.savingsManagerService.createSavingsGoal(request);
  }

  /**
   * Actualizar objetivo de ahorro
   * PUT /api/savings-goals/:id
   */
  @Put(':id')
  async updateSavingsGoal(
    @Param('id', ParseIntPipe) id: number,
    @Body() apiRequest: UpdateSavingsGoalApiRequest,
  ): Promise<SavingsGoalModel> {
    const userId = await this.currentUserService.getCurrentUserId();

    const request = new UpdateSavingsGoalRequest(
      id,
      userId,
      apiRequest.currencyId,
      apiRequest.name,
      apiRequest.targetAmount,
      apiRequest.progressionTypeId,
      apiRequest.statusId,
      new Date(apiRequest.startDate),
      apiRequest.description || null,
      apiRequest.numberOfInstallments || null,
      apiRequest.baseAmount || null,
      apiRequest.incrementAmount || null,
      apiRequest.expectedEndDate ? new Date(apiRequest.expectedEndDate) : null,
    );

    return await this.savingsManagerService.updateSavingsGoal(request);
  }

  /**
   * Eliminar objetivo de ahorro
   * DELETE /api/savings-goals/:id
   */
  @Delete(':id')
  async deleteSavingsGoal(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MessageModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    await this.savingsManagerService.deleteSavingsGoal(id, userId);
    return new MessageModel('Savings goal deleted successfully');
  }

  // ==================== INSTALLMENTS ====================

  /**
   * Obtener todas las cuotas de un objetivo
   * GET /api/savings-goals/:goalId/installments
   */
  @Get(':goalId/installments')
  async getInstallmentsByGoalId(
    @Param('goalId', ParseIntPipe) goalId: number,
  ): Promise<SavingsInstallmentModel[]> {
    const userId = await this.currentUserService.getCurrentUserId();
    return await this.savingsManagerService.getInstallmentsByGoalId(goalId, userId);
  }

  /**
   * Obtener cuotas pendientes de un objetivo
   * GET /api/savings-goals/:goalId/installments/pending
   */
  @Get(':goalId/installments/pending')
  async getPendingInstallments(
    @Param('goalId', ParseIntPipe) goalId: number,
  ): Promise<SavingsInstallmentModel[]> {
    const userId = await this.currentUserService.getCurrentUserId();
    return await this.savingsManagerService.getPendingInstallments(goalId, userId);
  }

  /**
   * Pagar una cuota
   * POST /api/savings-goals/:goalId/installments/:installmentId/pay
   */
  @Post(':goalId/installments/:installmentId/pay')
  async payInstallment(
    @Param('goalId', ParseIntPipe) goalId: number,
    @Param('installmentId', ParseIntPipe) installmentId: number,
    @Body() apiRequest: PayInstallmentApiRequest,
  ): Promise<SavingsDepositModel> {
    const userId = await this.currentUserService.getCurrentUserId();

    const request = new PayInstallmentRequest(
      userId,
      goalId,
      installmentId,
      apiRequest.amount,
      apiRequest.description,
    );

    return await this.savingsManagerService.payInstallment(request);
  }

  /**
   * Omitir una cuota
   * PUT /api/savings-goals/:goalId/installments/:installmentId/skip
   */
  @Put(':goalId/installments/:installmentId/skip')
  async skipInstallment(
    @Param('goalId', ParseIntPipe) goalId: number,
    @Param('installmentId', ParseIntPipe) installmentId: number,
  ): Promise<SavingsInstallmentModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    return await this.savingsManagerService.skipInstallment(
      installmentId,
      userId,
      goalId,
    );
  }

  /**
   * Agregar más cuotas a un objetivo
   * POST /api/savings-goals/:goalId/installments/add
   */
  @Post(':goalId/installments/add')
  async addInstallments(
    @Param('goalId', ParseIntPipe) goalId: number,
    @Body() apiRequest: AddInstallmentsApiRequest,
  ): Promise<SavingsInstallmentModel[]> {
    const userId = await this.currentUserService.getCurrentUserId();

    const request = new AddInstallmentsRequest(
      userId,
      goalId,
      apiRequest.numberOfNewInstallments,
    );

    return await this.savingsManagerService.addInstallments(request);
  }

  // ==================== DEPOSITS ====================

  /**
   * Obtener todos los depósitos de un objetivo
   * GET /api/savings-goals/:goalId/deposits
   */
  @Get(':goalId/deposits')
  async getDepositsByGoalId(
    @Param('goalId', ParseIntPipe) goalId: number,
  ): Promise<SavingsDepositModel[]> {
    const userId = await this.currentUserService.getCurrentUserId();
    return await this.savingsManagerService.getDepositsByGoalId(goalId, userId);
  }

  /**
   * Crear depósito libre (FreeForm)
   * POST /api/savings-goals/:goalId/deposits/freeform
   */
  @Post(':goalId/deposits/freeform')
  async createFreeFormDeposit(
    @Param('goalId', ParseIntPipe) goalId: number,
    @Body() apiRequest: CreateFreeFormDepositApiRequest,
  ): Promise<SavingsDepositModel> {
    const userId = await this.currentUserService.getCurrentUserId();

    const request = new CreateFreeFormDepositRequest(
      userId,
      goalId,
      apiRequest.amount,
      apiRequest.description,
    );

    return await this.savingsManagerService.createFreeFormDeposit(request);
  }

  /**
   * Eliminar un depósito
   * DELETE /api/deposits/:depositId
   */
  @Delete('deposits/:depositId')
  async deleteDeposit(
    @Param('depositId', ParseIntPipe) depositId: number,
  ): Promise<MessageModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    await this.savingsManagerService.deleteDeposit(depositId, userId);
    return new MessageModel('Deposit deleted successfully');
  }
}