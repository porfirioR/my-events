// manager/services/savings-manager.service.ts

import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ISavingsGoalAccessService,
  ISavingsInstallmentAccessService,
  ISavingsDepositAccessService,
  CreateSavingsGoalAccessRequest,
  UpdateSavingsGoalAccessRequest,
  CreateSavingsInstallmentAccessRequest,
  CreateSavingsDepositAccessRequest,
  SavingsGoalAccessModel,
  SavingsInstallmentAccessModel,
  SavingsDepositAccessModel,
} from '../../access/contract/savings';
import {
  SavingsGoalModel,
  SavingsInstallmentModel,
  SavingsDepositModel,
  CreateSavingsGoalRequest,
  UpdateSavingsGoalRequest,
  PayInstallmentRequest,
  CreateFreeFormDepositRequest,
  AddInstallmentsRequest,
} from '../models/savings';
import { SavingsCalculatorHelper } from '../../utility/helpers/savings-calculator.helper';
import { SAVINGS_TOKENS } from '../../utility/constants/injection-tokens.const';
import { ProgressionType } from 'src/utility/enums';

@Injectable()
export class SavingsManagerService {
  constructor(
    @Inject(SAVINGS_TOKENS.GOAL_ACCESS_SERVICE)
    private readonly savingsGoalAccessService: ISavingsGoalAccessService,

    @Inject(SAVINGS_TOKENS.INSTALLMENT_ACCESS_SERVICE)
    private readonly savingsInstallmentAccessService: ISavingsInstallmentAccessService,

    @Inject(SAVINGS_TOKENS.DEPOSIT_ACCESS_SERVICE)
    private readonly savingsDepositAccessService: ISavingsDepositAccessService,
  ) {}

  // ==================== SAVINGS GOALS ====================

  /**
   * Crear objetivo de ahorro
   * - Calcula targetAmount automáticamente (excepto FreeForm)
   * - Genera cuotas automáticamente (excepto FreeForm)
   */
  public createSavingsGoal = async (request: CreateSavingsGoalRequest): Promise<SavingsGoalModel> => {
    // Validar tipo de progresión
    await this.validateProgressionType(request.progressionTypeId);

    let targetAmount: number;
    let installmentAmounts: number[] = [];

    // FreeForm: el usuario debe proporcionar targetAmount
    if (request.progressionTypeId === ProgressionType.FreeForm) {
      if (!request.targetAmount) {
        throw new BadRequestException('targetAmount is required for FreeForm type');
      }
      if (request.numberOfInstallments || request.baseAmount) {
        throw new BadRequestException('FreeForm type should not have numberOfInstallments or baseAmount');
      }
      targetAmount = request.targetAmount;
    } else {
      // Otros tipos: validar campos requeridos
      if (!request.numberOfInstallments || !request.baseAmount) {
        throw new BadRequestException('numberOfInstallments and baseAmount are required');
      }

      // Validar incrementAmount para Ascending/Descending
      if ((request.progressionTypeId === ProgressionType.Ascending || request.progressionTypeId === ProgressionType.Descending) && !request.incrementAmount) {
        throw new BadRequestException('incrementAmount is required for Ascending/Descending types');
      }

      // Calcular targetAmount
      targetAmount = SavingsCalculatorHelper.calculateTargetAmount(
        request.progressionTypeId,
        +request.baseAmount,
        +request.numberOfInstallments,
        +request.incrementAmount,
      );

      // Si el usuario proporcionó un targetAmount, validar que coincida
      if (request.targetAmount && request.targetAmount !== targetAmount) {
        throw new BadRequestException(
          `Target amount mismatch. Expected ${targetAmount}, got ${request.targetAmount}`
        );
      }

      // Generar montos de cuotas
      installmentAmounts = SavingsCalculatorHelper.calculateInstallmentAmounts(
        request.progressionTypeId,
        +request.baseAmount,
        +request.numberOfInstallments,
        +request.incrementAmount,
      );
    }

    // Crear el objetivo de ahorro
    const accessRequest = new CreateSavingsGoalAccessRequest(
      request.userId,
      request.currencyId,
      request.name,
      targetAmount,
      request.progressionTypeId,
      request.startDate,
      request.description,
      request.numberOfInstallments,
      request.baseAmount,
      request.incrementAmount,
      request.expectedEndDate,
    );

    const goalAccessModel = await this.savingsGoalAccessService.create(accessRequest);

    // Crear cuotas si no es FreeForm
    if (installmentAmounts.length > 0) {
      const installmentRequests = installmentAmounts.map((amount, index) =>
        new CreateSavingsInstallmentAccessRequest(
          goalAccessModel.id,
          index + 1,
          amount,
          1, // statusId = 1 (Pending)
          null, // dueDate
        )
      );

      await this.savingsInstallmentAccessService.createMany(installmentRequests);
    }

    return this.mapGoalAccessModelToModel(goalAccessModel);
  };

  /**
   * Obtener objetivo de ahorro por ID
   */
  public getSavingsGoalById = async (id: number, userId: number): Promise<SavingsGoalModel> => {
    const accessModel = await this.savingsGoalAccessService.getById(id, userId);
    return this.mapGoalAccessModelToModel(accessModel);
  };

  /**
   * Obtener todos los objetivos de ahorro del usuario
   */
  public getAllSavingsGoals = async (userId: number): Promise<SavingsGoalModel[]> => {
    const accessModelList = await this.savingsGoalAccessService.getAll(userId);
    return accessModelList.map(this.mapGoalAccessModelToModel);
  };

  /**
   * Obtener objetivos por estado
   */
  public getSavingsGoalsByStatus = async (userId: number, statusId: number): Promise<SavingsGoalModel[]> => {
    const accessModelList = await this.savingsGoalAccessService.getByStatus(userId, statusId);
    return accessModelList.map(this.mapGoalAccessModelToModel);
  };

  /**
   * Actualizar objetivo de ahorro
   */
  public updateSavingsGoal = async (request: UpdateSavingsGoalRequest): Promise<SavingsGoalModel> => {
    // Obtener el objetivo actual
    const currentGoal = await this.savingsGoalAccessService.getById(request.id, request.userId);

    // Crear access request con todos los campos del modelo actual
    const accessRequest = new UpdateSavingsGoalAccessRequest(
      request.id,
      request.userId,
      request.currencyId,
      request.name,
      request.targetAmount,
      currentGoal.currentAmount,
      request.progressionTypeId,
      request.statusId,
      request.startDate,
      request.description,
      request.numberOfInstallments,
      request.baseAmount,
      request.incrementAmount,
      request.expectedEndDate,
      currentGoal.completedDate,
      currentGoal.dateCreated,
      new Date(),
    );

    const accessModel = await this.savingsGoalAccessService.update(accessRequest);
    return this.mapGoalAccessModelToModel(accessModel);
  };

  /**
   * Eliminar objetivo de ahorro
   */
  public deleteSavingsGoal = async (id: number, userId: number): Promise<void> => {
    await this.savingsGoalAccessService.delete(id, userId);
  };

  /**
   * Obtener estadísticas de objetivos
   */
  public getSavingsGoalStats = async (userId: number) => {
    return await this.savingsGoalAccessService.getStats(userId);
  };

  // ==================== INSTALLMENTS ====================

  /**
   * Obtener todas las cuotas de un objetivo
   */
  public getInstallmentsByGoalId = async (savingsGoalId: number, userId: number): Promise<SavingsInstallmentModel[]> => {
    // Validar que el objetivo pertenece al usuario
    await this.savingsGoalAccessService.getById(savingsGoalId, userId);

    const accessModelList = await this.savingsInstallmentAccessService.getBySavingsGoalId(savingsGoalId);
    return accessModelList.map(this.mapInstallmentAccessModelToModel);
  };

  /**
   * Obtener cuotas pendientes de un objetivo
   */
  public getPendingInstallments = async (savingsGoalId: number, userId: number): Promise<SavingsInstallmentModel[]> => {
    // Validar que el objetivo pertenece al usuario
    await this.savingsGoalAccessService.getById(savingsGoalId, userId);

    const accessModelList = await this.savingsInstallmentAccessService.getPendingInstallments(savingsGoalId);
    return accessModelList.map(this.mapInstallmentAccessModelToModel);
  };

  /**
   * Pagar una cuota
   * FLUJO COMPLETO:
   * 1. Validar que el objetivo existe y está activo
   * 2. Validar que la cuota existe y está pendiente
   * 3. Crear el depósito
   * 4. Marcar la cuota como pagada
   * 5. Actualizar currentAmount del objetivo
   * 6. Si currentAmount >= targetAmount, marcar objetivo como completado
   */
  public payInstallment = async (request: PayInstallmentRequest): Promise<SavingsDepositModel> => {
    // 1. Validar objetivo
    const goal = await this.savingsGoalAccessService.getById(request.savingsGoalId, request.userId);

    if (goal.statusId !== 1) { // 1 = Active
      throw new BadRequestException('Cannot pay installments for inactive goals');
    }

    // 2. Validar cuota
    const installment = await this.savingsInstallmentAccessService.getById(request.installmentId);

    if (installment.savingsGoalId !== request.savingsGoalId) {
      throw new BadRequestException('Installment does not belong to this goal');
    }

    if (installment.statusId !== 1) { // 1 = Pending
      throw new BadRequestException('Installment is not pending');
    }

    // Validar que el monto no exceda el monto de la cuota
    if (request.amount > installment.amount) {
      throw new BadRequestException(`Amount cannot exceed installment amount (${installment.amount})`);
    }

    // 3. Crear el depósito
    const depositAccessRequest = new CreateSavingsDepositAccessRequest(
      request.savingsGoalId,
      request.amount,
      new Date(),
      request.installmentId,
      request.description,
    );

    const depositAccessModel = await this.savingsDepositAccessService.create(depositAccessRequest);

    // 4. Marcar cuota como pagada (solo si se pagó el monto completo)
    if (request.amount === installment.amount) {
      await this.savingsInstallmentAccessService.markAsPaid(request.installmentId, new Date());
    }

    // 5. Actualizar currentAmount
    const newCurrentAmount = goal.currentAmount + request.amount;
    await this.savingsGoalAccessService.updateCurrentAmount(request.savingsGoalId, request.userId, newCurrentAmount);

    // 6. Verificar si se completó el objetivo
    if (newCurrentAmount >= goal.targetAmount) {
      await this.savingsGoalAccessService.markAsCompleted(request.savingsGoalId, request.userId);
    }

    return this.mapDepositAccessModelToModel(depositAccessModel);
  };

  /**
   * Omitir una cuota (marcar como skipped)
   */
  public skipInstallment = async (installmentId: number, userId: number, savingsGoalId: number): Promise<SavingsInstallmentModel> => {
    // Validar que el objetivo pertenece al usuario
    await this.savingsGoalAccessService.getById(savingsGoalId, userId);

    const accessModel = await this.savingsInstallmentAccessService.markAsSkipped(installmentId);
    return this.mapInstallmentAccessModelToModel(accessModel);
  };

  /**
   * Agregar más cuotas a un objetivo (solo Ascending, Random, Fixed)
   * FLUJO:
   * 1. Validar que el tipo permite agregar cuotas
   * 2. Obtener la última cuota
   * 3. Generar nuevas cuotas
   * 4. Actualizar targetAmount del objetivo
   */
  public addInstallments = async (request: AddInstallmentsRequest): Promise<SavingsInstallmentModel[]> => {
    // 1. Validar objetivo
    const goal = await this.savingsGoalAccessService.getById(request.savingsGoalId, request.userId);

    if (goal.progressionTypeId === 3) { // Descending
      throw new BadRequestException('Cannot add installments to Descending type');
    }

    if (goal.progressionTypeId === 5) { // FreeForm
      throw new BadRequestException('FreeForm type does not have installments');
    }

    // 2. Obtener todas las cuotas actuales
    const currentInstallments = await this.savingsInstallmentAccessService.getBySavingsGoalId(request.savingsGoalId);

    if (currentInstallments.length === 0) {
      throw new BadRequestException('No existing installments found');
    }

    // Obtener la última cuota
    const lastInstallment = currentInstallments[currentInstallments.length - 1];
    const lastAmount = lastInstallment.amount;
    const increment = goal.incrementAmount || goal.baseAmount || 0;

    // 3. Generar nuevas cuotas
    const newAmounts = SavingsCalculatorHelper.generateAdditionalInstallments(
      goal.progressionTypeId,
      lastAmount,
      increment,
      request.numberOfNewInstallments,
    );

    const newInstallmentRequests = newAmounts.map((amount, index) =>
      new CreateSavingsInstallmentAccessRequest(
        request.savingsGoalId,
        lastInstallment.installmentNumber + index + 1,
        amount,
        1, // statusId = 1 (Pending)
        null,
      )
    );

    const newInstallments = await this.savingsInstallmentAccessService.createMany(newInstallmentRequests);

    // 4. Actualizar targetAmount del objetivo
    const additionalAmount = newAmounts.reduce((sum, amount) => sum + amount, 0);
    const newTargetAmount = goal.targetAmount + additionalAmount;

    const updateRequest = new UpdateSavingsGoalAccessRequest(
      goal.id,
      goal.userId,
      goal.currencyId,
      goal.name,
      newTargetAmount,
      goal.currentAmount,
      goal.progressionTypeId,
      goal.statusId,
      goal.startDate,
      goal.description,
      goal.numberOfInstallments + request.numberOfNewInstallments,
      goal.baseAmount,
      goal.incrementAmount,
      goal.expectedEndDate,
      goal.completedDate,
      goal.dateCreated,
      new Date(),
    );

    await this.savingsGoalAccessService.update(updateRequest);

    return newInstallments.map(this.mapInstallmentAccessModelToModel);
  };

  // ==================== DEPOSITS ====================

  /**
   * Crear depósito libre (FreeForm)
   * FLUJO:
   * 1. Validar que el objetivo es FreeForm y está activo
   * 2. Validar que el monto no exceda el target
   * 3. Crear el depósito
   * 4. Actualizar currentAmount
   * 5. Si currentAmount >= targetAmount, marcar como completado
   */
  public createFreeFormDeposit = async (request: CreateFreeFormDepositRequest): Promise<SavingsDepositModel> => {
    // 1. Validar objetivo
    const goal = await this.savingsGoalAccessService.getById(request.savingsGoalId, request.userId);

    if (goal.progressionTypeId !== 5) { // FreeForm
      throw new BadRequestException('This operation is only for FreeForm savings goals');
    }

    if (goal.statusId !== 1) { // Active
      throw new BadRequestException('Cannot add deposits to inactive goals');
    }

    // 2. Validar que no exceda el target
    const newTotal = goal.currentAmount + request.amount;
    if (newTotal > goal.targetAmount) {
      const remaining = goal.targetAmount - goal.currentAmount;
      throw new BadRequestException(
        `Deposit would exceed target. Remaining: ${remaining}`
      );
    }

    // 3. Crear el depósito
    const depositAccessRequest = new CreateSavingsDepositAccessRequest(
      request.savingsGoalId,
      request.amount,
      new Date(),
      null, // installmentId = null para FreeForm
      request.description,
    );

    const depositAccessModel = await this.savingsDepositAccessService.create(depositAccessRequest);

    // 4. Actualizar currentAmount
    await this.savingsGoalAccessService.updateCurrentAmount(request.savingsGoalId, request.userId, newTotal);

    // 5. Verificar si se completó
    if (newTotal >= goal.targetAmount) {
      await this.savingsGoalAccessService.markAsCompleted(request.savingsGoalId, request.userId);
    }

    return this.mapDepositAccessModelToModel(depositAccessModel);
  };

  /**
   * Obtener todos los depósitos de un objetivo
   */
  public getDepositsByGoalId = async (savingsGoalId: number, userId: number): Promise<SavingsDepositModel[]> => {
    // Validar que el objetivo pertenece al usuario
    await this.savingsGoalAccessService.getById(savingsGoalId, userId);

    const accessModelList = await this.savingsDepositAccessService.getBySavingsGoalId(savingsGoalId);
    return accessModelList.map(this.mapDepositAccessModelToModel);
  };

  /**
   * Obtener depósitos de una cuota específica
   */
  public getDepositsByInstallmentId = async (installmentId: number): Promise<SavingsDepositModel[]> => {
    const accessModelList = await this.savingsDepositAccessService.getByInstallmentId(installmentId);
    return accessModelList.map(this.mapDepositAccessModelToModel);
  };

  /**
   * Eliminar un depósito
   * IMPORTANTE: También actualiza el currentAmount del objetivo
   */
  public deleteDeposit = async (depositId: number, userId: number): Promise<void> => {
    const deposit = await this.savingsDepositAccessService.getById(depositId);
    const goal = await this.savingsGoalAccessService.getById(deposit.savingsGoalId, userId);

    // Actualizar currentAmount
    const newCurrentAmount = goal.currentAmount - deposit.amount;
    await this.savingsGoalAccessService.updateCurrentAmount(goal.id, userId, newCurrentAmount);

    // Si el objetivo estaba completado y ahora ya no, reactivarlo
    if (goal.statusId === 2 && newCurrentAmount < goal.targetAmount) { // 2 = Completed
      await this.savingsGoalAccessService.updateStatus(goal.id, userId, 1); // 1 = Active
    }

    await this.savingsDepositAccessService.delete(depositId);
  };

  // ==================== MÉTODOS PRIVADOS ====================

  private validateProgressionType = async (progressionTypeId: number): Promise<void> => {
    const validTypes = [1, 2, 3, 4, 5]; // Fixed, Ascending, Descending, Random, FreeForm
    if (!validTypes.includes(progressionTypeId)) {
      throw new BadRequestException(`Invalid progression type: ${progressionTypeId}`);
    }
  };

  // Mappers
  private mapGoalAccessModelToModel = (accessModel: SavingsGoalAccessModel): SavingsGoalModel => {
    return new SavingsGoalModel(
      accessModel.id,
      accessModel.userId,
      accessModel.currencyId,
      accessModel.name,
      accessModel.targetAmount,
      accessModel.currentAmount,
      accessModel.progressionTypeId,
      accessModel.statusId,
      accessModel.startDate,
      accessModel.description,
      accessModel.numberOfInstallments,
      accessModel.baseAmount,
      accessModel.incrementAmount,
      accessModel.expectedEndDate,
      accessModel.completedDate,
      accessModel.dateCreated,
      accessModel.dateUpdated,
    );
  };

  private mapInstallmentAccessModelToModel = (accessModel: SavingsInstallmentAccessModel): SavingsInstallmentModel => {
    return new SavingsInstallmentModel(
      accessModel.id,
      accessModel.savingsGoalId,
      accessModel.installmentNumber,
      accessModel.amount,
      accessModel.statusId,
      accessModel.dueDate,
      accessModel.paidDate,
      accessModel.dateCreated,
    );
  };

  private mapDepositAccessModelToModel = (accessModel: SavingsDepositAccessModel): SavingsDepositModel => {
    return new SavingsDepositModel(
      accessModel.id,
      accessModel.savingsGoalId,
      accessModel.amount,
      accessModel.depositDate,
      accessModel.installmentId,
      accessModel.description,
    );
  };
}