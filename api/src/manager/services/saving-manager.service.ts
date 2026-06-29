import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  ISavingsGoalAccessService,
  ISavingsInstallmentAccessService,
  ISavingsDepositAccessService,
  ISavingsProgrammedTermAccessService,
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
  SavingsProgrammedTermModel,
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

    @Inject(SAVINGS_TOKENS.PROGRAMMED_TERM_ACCESS_SERVICE)
    private readonly savingsProgrammedTermAccessService: ISavingsProgrammedTermAccessService,
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
    } else if (request.progressionTypeId === ProgressionType.FixedDeposit || request.progressionTypeId === ProgressionType.CDA) {
      // FixedDeposit / CDA: single lump-sum with simple interest (CDA has higher rates)
      if (!request.baseAmount || !request.numberOfInstallments || !request.annualRatePercentage) {
        throw new BadRequestException('baseAmount, numberOfInstallments (term in months), and annualRatePercentage are required for FixedDeposit/CDA type');
      }
      // Use user-provided targetAmount if given (bank may quote a different amount than calculated)
      if (request.targetAmount) {
        targetAmount = request.targetAmount;
      } else {
        const interest = +request.baseAmount * (request.annualRatePercentage / 100) * (+request.numberOfInstallments / 12);
        targetAmount = Math.round(+request.baseAmount + interest);
      }
      // No installments generated — a single deposit is auto-created below
    } else {
      // Otros tipos: validar campos requeridos
      if (!request.numberOfInstallments || !request.baseAmount) {
        throw new BadRequestException('numberOfInstallments and baseAmount are required');
      }

      // Validar incrementAmount para Ascending/Descending
      if ((request.progressionTypeId === ProgressionType.Ascending || request.progressionTypeId === ProgressionType.Descending) && !request.incrementAmount) {
        throw new BadRequestException('incrementAmount is required for Ascending/Descending types');
      }

      if (request.progressionTypeId === ProgressionType.Scheduled) {
        // Scheduled: requiere tasa de interés anual
        if (!request.annualRatePercentage) {
          throw new BadRequestException('annualRatePercentage is required for Scheduled type');
        }
        // Si el usuario sobrescribió el monto esperado, usarlo directamente
        if (request.targetAmount) {
          targetAmount = request.targetAmount;
        } else {
          // Calcular con fórmula de anualidad anticipada
          const i = request.annualRatePercentage / 100 / 12;
          targetAmount = Math.round(+request.baseAmount * ((Math.pow(1 + i, +request.numberOfInstallments) - 1) / i) * (1 + i));
        }
      } else {
        // Fixed, Ascending, Descending, Random
        targetAmount = SavingsCalculatorHelper.calculateTargetAmount(
          request.progressionTypeId,
          +request.baseAmount,
          +request.numberOfInstallments,
          +request.incrementAmount,
        );

        // Validar que el targetAmount provisto coincida con el calculado
        if (request.targetAmount && Math.abs(request.targetAmount - targetAmount) > 0.01) {
          throw new BadRequestException(
            `Target amount mismatch. Expected ${targetAmount}, got ${request.targetAmount}`
          );
        }
      }

      // Generar montos de cuotas
      installmentAmounts = SavingsCalculatorHelper.calculateInstallmentAmounts(
        request.progressionTypeId,
        +request.baseAmount,
        +request.numberOfInstallments,
        +request.incrementAmount,
      );
    }

    // Calcular fechas de vencimiento si es ahorro programado mensual
    let dueDates: Date[] = [];
    let computedExpectedEndDate = request.expectedEndDate ?? null;

    if ((request.progressionTypeId === ProgressionType.FixedDeposit || request.progressionTypeId === ProgressionType.CDA) && request.numberOfInstallments) {
      computedExpectedEndDate = SavingsCalculatorHelper.addMonths(request.startDate, +request.numberOfInstallments);
    } else if (request.frequencyId && request.numberOfInstallments) {
      const paymentDay = SavingsCalculatorHelper.getPaymentDayFromPeriod(request.paymentPeriod ?? 1);
      dueDates = SavingsCalculatorHelper.calculateMonthlyDueDates(
        request.startDate,
        +request.numberOfInstallments,
        paymentDay,
      );
      computedExpectedEndDate = dueDates[dueDates.length - 1];
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
      computedExpectedEndDate,
      request.frequencyId,
      request.annualRatePercentage,
      request.paymentPeriod,
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
          dueDates[index] ?? null,
        )
      );

      const createdInstallments = await this.savingsInstallmentAccessService.createMany(installmentRequests);

      // Scheduled savings: auto-pay the first installment using the goal start date
      if (request.progressionTypeId === ProgressionType.Scheduled && createdInstallments.length > 0) {
        const first = createdInstallments.find(i => i.installmentNumber === 1) ?? createdInstallments[0];
        await this.savingsDepositAccessService.create(new CreateSavingsDepositAccessRequest(
          goalAccessModel.id,
          first.amount,
          request.startDate,
          first.id,
          null,
        ));
        await this.savingsInstallmentAccessService.markAsPaid(first.id, request.startDate);
        await this.savingsGoalAccessService.updateCurrentAmount(goalAccessModel.id, request.userId, first.amount);
        // Re-fetch so the returned model reflects the updated currentAmount
        const refreshed = await this.savingsGoalAccessService.getById(goalAccessModel.id, request.userId);
        return this.mapGoalAccessModelToModel(refreshed);
      }
    }

    // FixedDeposit / CDA: auto-create the initial deposit for the full principal
    if ((request.progressionTypeId === ProgressionType.FixedDeposit || request.progressionTypeId === ProgressionType.CDA) && request.baseAmount) {
      await this.savingsDepositAccessService.create(new CreateSavingsDepositAccessRequest(
        goalAccessModel.id,
        +request.baseAmount,
        request.startDate,
        null,
        null,
      ));
      await this.savingsGoalAccessService.updateCurrentAmount(goalAccessModel.id, request.userId, +request.baseAmount);
      const refreshed = await this.savingsGoalAccessService.getById(goalAccessModel.id, request.userId);
      return this.mapGoalAccessModelToModel(refreshed);
    }

    return this.mapGoalAccessModelToModel(goalAccessModel);
  };

  /**
   * Obtener objetivo de ahorro por ID
   */
  public getSavingsGoalById = async (id: number, userId: number): Promise<SavingsGoalModel> => {
    const accessModel = await this.savingsGoalAccessService.getById(id, userId);
    const matured = await this.autoCompleteIfMatured(accessModel, userId);
    return this.mapGoalAccessModelToModel(matured);
  };

  /**
   * Obtener todos los objetivos de ahorro del usuario
   */
  public getAllSavingsGoals = async (userId: number): Promise<SavingsGoalModel[]> => {
    const accessModelList = await this.savingsGoalAccessService.getAll(userId);
    const resolved = await Promise.all(accessModelList.map(g => this.autoCompleteIfMatured(g, userId)));
    return resolved.map(this.mapGoalAccessModelToModel);
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
      request.frequencyId,
      request.annualRatePercentage,
      request.paymentPeriod,
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
    // Verify the goal belongs to the user
    await this.savingsGoalAccessService.getById(savingsGoalId, userId);

    const accessModelList = await this.savingsInstallmentAccessService.getPendingInstallments(savingsGoalId);
    return accessModelList.map(this.mapInstallmentAccessModelToModel);
  };

  /**
   * Pay an installment
   * Full flow:
   * 1. Validate goal exists and is active
   * 2. Validate installment exists and is pending
   * 3. Create deposit
   * 4. Mark installment as paid
   * 5. Update goal currentAmount
   * 6. If currentAmount >= targetAmount, mark goal as completed
   */
  public payInstallment = async (request: PayInstallmentRequest): Promise<SavingsDepositModel> => {
    // 1. Validate goal
    const goal = await this.savingsGoalAccessService.getById(request.savingsGoalId, request.userId);

    if (goal.statusId !== 1) { // 1 = Active
      throw new BadRequestException('Cannot pay installments for inactive goals');
    }

    // 2. Validate installment
    const installment = await this.savingsInstallmentAccessService.getById(request.installmentId);

    if (installment.savingsGoalId !== request.savingsGoalId) {
      throw new BadRequestException('Installment does not belong to this goal');
    }

    if (installment.statusId !== 1) { // 1 = Pending
      throw new BadRequestException('Installment is not pending');
    }

    // Amount must not exceed the installment amount
    if (request.amount > installment.amount) {
      throw new BadRequestException(`Amount cannot exceed installment amount (${installment.amount})`);
    }

    // 3. Create deposit
    const depositAccessRequest = new CreateSavingsDepositAccessRequest(
      request.savingsGoalId,
      request.amount,
      new Date(),
      request.installmentId,
      request.description,
    );

    const depositAccessModel = await this.savingsDepositAccessService.create(depositAccessRequest);

    // 4. Mark installment as paid (only if full amount was paid)
    if (Math.abs(request.amount - installment.amount) < 0.01) {
      await this.savingsInstallmentAccessService.markAsPaid(request.installmentId, new Date());
    }

    // 5. Update currentAmount
    const newCurrentAmount = goal.currentAmount + request.amount;
    await this.savingsGoalAccessService.updateCurrentAmount(request.savingsGoalId, request.userId, newCurrentAmount);

    // 6. Check if goal is completed
    // For Scheduled, threshold is total deposited (baseAmount × installments), not the total with interest
    const completionThreshold = (goal.progressionTypeId === ProgressionType.Scheduled && goal.baseAmount && goal.numberOfInstallments)
      ? goal.baseAmount * goal.numberOfInstallments
      : goal.targetAmount;

    if (newCurrentAmount >= completionThreshold) {
      await this.savingsGoalAccessService.markAsCompleted(request.savingsGoalId, request.userId);
    }

    return this.mapDepositAccessModelToModel(depositAccessModel);
  };

  /**
   * Skip an installment (mark as skipped)
   */
  public skipInstallment = async (installmentId: number, userId: number, savingsGoalId: number): Promise<SavingsInstallmentModel> => {
    // Verify the goal belongs to the user
    await this.savingsGoalAccessService.getById(savingsGoalId, userId);

    const accessModel = await this.savingsInstallmentAccessService.markAsSkipped(installmentId);
    return this.mapInstallmentAccessModelToModel(accessModel);
  };

  /**
   * Add more installments to a goal (Ascending, Random, Fixed only)
   * Flow:
   * 1. Validate the progression type allows adding installments
   * 2. Get the last installment
   * 3. Generate new installments
   * 4. Update goal targetAmount
   */
  public addInstallments = async (request: AddInstallmentsRequest): Promise<SavingsInstallmentModel[]> => {
    // 1. Validate goal
    const goal = await this.savingsGoalAccessService.getById(request.savingsGoalId, request.userId);

    if (goal.progressionTypeId === 3) { // Descending
      throw new BadRequestException('Cannot add installments to Descending type');
    }

    if (goal.progressionTypeId === 5) { // FreeForm
      throw new BadRequestException('FreeForm type does not have installments');
    }

    if (goal.progressionTypeId === 6) { // Scheduled — fixed term, cannot extend
      throw new BadRequestException('Cannot add installments to Scheduled type');
    }

    if (goal.progressionTypeId === 7 || goal.progressionTypeId === 8) { // FixedDeposit / CDA — single deposit, no installments
      throw new BadRequestException('Cannot add installments to FixedDeposit/CDA type');
    }

    // 2. Get all current installments
    const currentInstallments = await this.savingsInstallmentAccessService.getBySavingsGoalId(request.savingsGoalId);

    if (currentInstallments.length === 0) {
      throw new BadRequestException('No existing installments found');
    }

    // Get the last installment
    const lastInstallment = currentInstallments[currentInstallments.length - 1];
    const lastAmount = lastInstallment.amount;
    const increment = goal.incrementAmount || goal.baseAmount || 0;

    // 3. Generate new installments
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

    // 4. Update goal targetAmount
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
      goal.frequencyId,
      goal.annualRatePercentage,
      goal.paymentPeriod,
    );

    await this.savingsGoalAccessService.update(updateRequest);

    return newInstallments.map(this.mapInstallmentAccessModelToModel);
  };

  // ==================== DEPOSITS ====================

  /**
   * Create a free-form deposit (FreeForm goals only)
   * Flow:
   * 1. Validate goal is FreeForm and active
   * 2. Validate amount does not exceed remaining target
   * 3. Create deposit
   * 4. Update currentAmount
   * 5. If currentAmount >= targetAmount, mark goal as completed
   */
  public createFreeFormDeposit = async (request: CreateFreeFormDepositRequest): Promise<SavingsDepositModel> => {
    // 1. Validate goal
    const goal = await this.savingsGoalAccessService.getById(request.savingsGoalId, request.userId);

    if (goal.progressionTypeId !== 5) { // FreeForm
      throw new BadRequestException('This operation is only for FreeForm savings goals');
    }

    if (goal.statusId !== 1) { // Active
      throw new BadRequestException('Cannot add deposits to inactive goals');
    }

    // 2. Validate amount does not exceed target
    const newTotal = goal.currentAmount + request.amount;
    if (newTotal > goal.targetAmount) {
      const remaining = goal.targetAmount - goal.currentAmount;
      throw new BadRequestException(
        `Deposit would exceed target. Remaining: ${remaining}`
      );
    }

    // 3. Create deposit
    const depositAccessRequest = new CreateSavingsDepositAccessRequest(
      request.savingsGoalId,
      request.amount,
      new Date(),
      null, // installmentId is null for FreeForm
      request.description,
    );

    const depositAccessModel = await this.savingsDepositAccessService.create(depositAccessRequest);

    // 4. Update currentAmount
    await this.savingsGoalAccessService.updateCurrentAmount(request.savingsGoalId, request.userId, newTotal);

    // 5. Check if goal is completed
    if (newTotal >= goal.targetAmount) {
      await this.savingsGoalAccessService.markAsCompleted(request.savingsGoalId, request.userId);
    }

    return this.mapDepositAccessModelToModel(depositAccessModel);
  };

  /**
   * Get all deposits for a goal
   */
  public getDepositsByGoalId = async (savingsGoalId: number, userId: number): Promise<SavingsDepositModel[]> => {
    // Verify the goal belongs to the user
    await this.savingsGoalAccessService.getById(savingsGoalId, userId);

    const accessModelList = await this.savingsDepositAccessService.getBySavingsGoalId(savingsGoalId);
    return accessModelList.map(this.mapDepositAccessModelToModel);
  };

  /**
   * Get deposits for a specific installment
   */
  public getDepositsByInstallmentId = async (installmentId: number): Promise<SavingsDepositModel[]> => {
    const accessModelList = await this.savingsDepositAccessService.getByInstallmentId(installmentId);
    return accessModelList.map(this.mapDepositAccessModelToModel);
  };

  /**
   * Delete a deposit
   * NOTE: Also updates the goal's currentAmount
   */
  public deleteDeposit = async (depositId: number, userId: number): Promise<void> => {
    const deposit = await this.savingsDepositAccessService.getById(depositId);
    const goal = await this.savingsGoalAccessService.getById(deposit.savingsGoalId, userId);

    // Update currentAmount
    const newCurrentAmount = Math.max(0, goal.currentAmount - deposit.amount);
    await this.savingsGoalAccessService.updateCurrentAmount(goal.id, userId, newCurrentAmount);

    // If goal was completed but no longer meets threshold, reactivate it
    const completionThreshold = (goal.progressionTypeId === ProgressionType.Scheduled && goal.baseAmount && goal.numberOfInstallments)
      ? goal.baseAmount * goal.numberOfInstallments
      : goal.targetAmount;

    if (goal.statusId === 2 && newCurrentAmount < completionThreshold) { // 2 = Completed
      await this.savingsGoalAccessService.updateStatus(goal.id, userId, 1); // 1 = Active
    }

    await this.savingsDepositAccessService.delete(depositId);
  };

  // ==================== PROGRAMMED TERMS ====================

  public getProgrammedTerms = async (): Promise<SavingsProgrammedTermModel[]> => {
    const accessModels = await this.savingsProgrammedTermAccessService.getAll();
    return accessModels.map(a => new SavingsProgrammedTermModel(a.id, a.termMonths, a.annualRatePercentage));
  };

  // ==================== PRIVATE METHODS ====================

  private autoCompleteIfMatured = async (goal: SavingsGoalAccessModel, userId: number): Promise<SavingsGoalAccessModel> => {
    if (
      (goal.progressionTypeId !== ProgressionType.FixedDeposit && goal.progressionTypeId !== ProgressionType.CDA) ||
      goal.statusId !== 1 ||
      !goal.expectedEndDate ||
      new Date(goal.expectedEndDate) > new Date()
    ) {
      return goal;
    }
    await this.savingsGoalAccessService.markAsCompleted(goal.id, userId);
    return { ...goal, statusId: 2, completedDate: new Date() };
  };

  private validateProgressionType = async (progressionTypeId: number): Promise<void> => {
    const validTypes = [1, 2, 3, 4, 5, 6, 7, 8]; // Fixed, Ascending, Descending, Random, FreeForm, Scheduled, FixedDeposit, CDA
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
      accessModel.frequencyId,
      accessModel.annualRatePercentage,
      accessModel.paymentPeriod,
      accessModel.paidInstallmentsCount,
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