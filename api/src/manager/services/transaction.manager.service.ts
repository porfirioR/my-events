import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AddReimbursementRequest, BalanceModel, CreateTransactionRequest, ITransactionManagerService, ReimbursementRequest, TransactionMatchModel, TransactionModel, TransactionReimbursementModel, TransactionSplitRequest, TransactionViewModel } from '../models/transactions';
import { ITransactionAccessService, ITransactionSplitAccessService, ITransactionReimbursementAccessService, CreateTransactionAccessRequest, CreateTransactionReimbursementAccessRequest, UpdateTransactionReimbursementTotalAccessRequest, CreateTransactionSplitAccessRequest, TransactionAccessModel, TransactionReimbursementAccessModel } from '../../access/contract/transactions';
import { CollaboratorSummaryModel } from '../models/collaborators';
import { COLLABORATOR_TOKENS, TRANSACTION_TOKENS } from '../../utility/constants';
import { ParticipantType, WhoPaid } from '../../utility/enums';
import { ICollaboratorAccessService } from '../../access/contract/collaborators';
import { ICollaboratorMatchAccessService } from '../../access/contract/collaborator-match';


@Injectable()
export class TransactionManagerService implements ITransactionManagerService {
  constructor(
    @Inject(TRANSACTION_TOKENS.ACCESS_SERVICE)
    private readonly transactionAccessService: ITransactionAccessService,
    @Inject(TRANSACTION_TOKENS.SPLIT_ACCESS_SERVICE)
    private readonly splitAccessService: ITransactionSplitAccessService,
    @Inject(TRANSACTION_TOKENS.REIMBURSEMENT_ACCESS_SERVICE)
    private readonly reimbursementAccessService: ITransactionReimbursementAccessService,
    @Inject(COLLABORATOR_TOKENS.ACCESS_SERVICE)
    private readonly collaboratorAccessService: ICollaboratorAccessService,
    @Inject(COLLABORATOR_TOKENS.MATCH_ACCESS_SERVICE)
    private readonly matchAccessService: ICollaboratorMatchAccessService,
  ) {}

  public createTransaction = async (request: CreateTransactionRequest): Promise<TransactionModel> => {
    // 1. Validar el reintegro
    this.validateReimbursement(request.totalAmount, request.reimbursement);

    // 2. Calcular el monto a dividir
    const amountToSplit = request.totalAmount - (request.reimbursement?.amount || 0);

    // 3. Validar estructura de splits
    this.validateSplitsStructure(request.splits, request.userId, request.collaboratorId);

    // 4. Validar que el pagador es correcto
    this.validatePayer(request.splits, request.whoPaid, request.userId, request.collaboratorId);

    // 5. Validar que los splits sumen correctamente
    this.validateSplitsTotal(request.splits, amountToSplit);

    // 6. Crear la transacción
    const transactionAccessRequest = new CreateTransactionAccessRequest(
      request.userId,
      request.collaboratorId,
      request.totalAmount,
      request.description,
      request.splitType,
      request.whoPaid,
      request.reimbursement?.amount || 0,
    );

    const transaction = await this.transactionAccessService.create(transactionAccessRequest);

    // 7. Si hay reintegro, crearlo
    if (request.reimbursement && request.reimbursement.amount > 0) {
      const reimbursementAccessRequest = new CreateTransactionReimbursementAccessRequest(
        transaction.id,
        request.reimbursement.amount,
        request.reimbursement.description,
      );
      await this.reimbursementAccessService.create(reimbursementAccessRequest);
    }

    // 8. Crear los splits
    await this.createSplits(transaction.id, request.splits);

    return this.mapToModel(transaction);
  };

  public addReimbursement = async (request: AddReimbursementRequest): Promise<TransactionReimbursementModel> => {
    // 1. Obtener la transacción actual
    const transaction = await this.transactionAccessService.getById(request.transactionId);

    if (!transaction) {
      throw new NotFoundException('Transacción no encontrada');
    }

    // 2. Validar que el reintegro sea mayor a 0
    if (request.amount <= 0) {
      throw new BadRequestException('El monto del reintegro debe ser mayor a 0');
    }

    // 3. Calcular el nuevo total de reintegros
    const currentReimbursementTotal = await this.reimbursementAccessService.getTotalByTransaction(
      request.transactionId,
    );
    const newReimbursementTotal = (+currentReimbursementTotal) + (+request.amount);

    // 4. Validar que no supere el monto total
    if (newReimbursementTotal > transaction.totalAmount) {
      throw new BadRequestException(
        `El reintegro total (${newReimbursementTotal}) no puede superar el monto de la transacción (${transaction.totalAmount})`,
      );
    }

    // 5. Validar que la transacción no esté liquidada
    const hasUnsettledSplits = await this.splitAccessService.hasUnsettledSplits(request.transactionId);
    if (!hasUnsettledSplits) {
      throw new BadRequestException('No se puede agregar reintegro a una transacción completamente liquidada');
    }

    // 6. Crear el reintegro
    const reimbursementAccessRequest = new CreateTransactionReimbursementAccessRequest(
      request.transactionId,
      request.amount,
      request.description,
    );
    const reimbursement = await this.reimbursementAccessService.create(reimbursementAccessRequest);

    // 7. Actualizar el total de reintegros en la transacción
    const updateRequest = new UpdateTransactionReimbursementTotalAccessRequest(
      request.transactionId,
      newReimbursementTotal,
    );
    await this.transactionAccessService.updateReimbursementTotal(updateRequest);

    return this.mapToReimbursementManagerModel(reimbursement);
  };

  public getTransactionById = async (id: number): Promise<TransactionModel> => {
    const transaction = await this.transactionAccessService.getById(id);

    if (!transaction) {
      throw new NotFoundException('Transacción no encontrada');
    }

    return this.mapToModel(transaction);
  };

  public getMyTransactions = async (userId: number): Promise<TransactionViewModel[]> => {
    // 1. Obtener transacciones creadas por mí
    const myCreatedTransactions = await this.transactionAccessService.getByUserId(userId);

    // 2. Obtener mis colaboradores externos (con email)
    const myCollaborators = await this.collaboratorAccessService.getLinkedCollaborators(userId);

    // 3. Obtener matches de mis colaboradores
    const matches = await this.matchAccessService.getMatchesByUserId(userId);

    // 4. Para cada match, obtener transacciones del otro usuario
    const theirTransactions: TransactionMatchModel[] = [];

    for (const match of matches) {
      const otherUserId = match.user1Id === userId ? match.user2Id : match.user1Id;
      const myCollaboratorId =
        match.user1Id === userId ? match.collaborator1Id : match.collaborator2Id;
      const theirCollaboratorId =
        match.user1Id === userId ? match.collaborator2Id : match.collaborator1Id;

      const transactions = await this.transactionAccessService.getByUserAndCollaborator(
        otherUserId,
        theirCollaboratorId,
      );

      theirTransactions.push(
        ...transactions.map((x) => ({
          ...x,
          matchInfo: {
            myCollaboratorId,
            theirCollaboratorId,
            otherUserId,
          },
        })),
      );
    }

    // 5. Mapear todas las transacciones a la vista del usuario
    const myViews = await Promise.all(myCreatedTransactions.map(x => this.mapToMyView(x, userId, true)));

    const theirViews = await Promise.all(theirTransactions.map(x => this.mapToTheirView(x, userId, false)));

    // 6. Combinar y ordenar por fecha
    return [...myViews, ...theirViews].sort(
      (a, b) => b.transactionDate.getTime() - a.transactionDate.getTime(),
    );
  };

  public getBalanceWithCollaborator = async (userId: number, collaboratorId: number): Promise<BalanceModel> => {
    // 1. Verificar si hay match
    const match = await this.matchAccessService.getMatchByCollaboratorId(collaboratorId);

    if (!match) {
      // Si no hay match, solo calcular desde mis transacciones
      return await this.calculateBalanceFromMyTransactions(userId, collaboratorId);
    }

    // 2. Identificar el otro usuario y su colaborador correspondiente
    const otherUserId = match.user1Id === userId ? match.user2Id : match.user1Id;
    const otherCollaboratorId =
      match.collaborator1Id === collaboratorId ? match.collaborator2Id : match.collaborator1Id;

    // 3. Obtener transacciones desde la perspectiva del usuario actual
    const myTransactions = await this.transactionAccessService.getByUserAndCollaborator(
      userId,
      collaboratorId,
    );

    // 4. Obtener transacciones desde la perspectiva del otro usuario
    const theirTransactions = await this.transactionAccessService.getByUserAndCollaborator(
      otherUserId,
      otherCollaboratorId,
    );

    let userOwes = 0;
    let collaboratorOwes = 0;

    // 5. Calcular deudas desde MIS transacciones
    for (const tx of myTransactions) {
      const splits = await this.splitAccessService.getByTransaction(tx.id);

      for (const split of splits) {
        // ✅ CORRECCIÓN: Solo considerar splits NO liquidados y NO pagadores
        if (!split.isSettled && !split.isPayer && split.amount > 0) {
          // Si el split es del colaborador → el colaborador me debe
          if (split.collaboratorId === collaboratorId) {
            collaboratorOwes += split.amount;
          }
          // Si el split es mío → yo le debo al colaborador
          if (split.userId === userId) {
            userOwes += split.amount;
          }
        }
      }
    }

    // 6. Calcular deudas desde SUS transacciones (invertido)
    for (const tx of theirTransactions) {
      const splits = await this.splitAccessService.getByTransaction(tx.id);

      for (const split of splits) {
        // ✅ CORRECCIÓN: Solo considerar splits NO liquidados y NO pagadores
        if (!split.isSettled && !split.isPayer && split.amount > 0) {
          // En SU transacción:
          // - Si el split es del "otherCollaboratorId" (que soy yo) → yo le debo
          if (split.collaboratorId === otherCollaboratorId) {
            userOwes += split.amount;
          }
          // - Si el split es del "otherUserId" (que es él) → él me debe
          if (split.userId === otherUserId) {
            collaboratorOwes += split.amount;
          }
        }
      }
    }

    const netBalance = collaboratorOwes - userOwes;

    return new BalanceModel(
      userId,
      collaboratorId,
      netBalance < 0 ? Math.abs(netBalance) : 0,  // userOwes
      netBalance > 0 ? netBalance : 0,             // collaboratorOwes
      netBalance,
    );
  };

  public getAllBalances = async (userId: number): Promise<BalanceModel[]> => {
    const collaborators = await this.collaboratorAccessService.getAll(userId);
    const balances: BalanceModel[] = [];

    for (const collaborator of collaborators) {
      if (collaborator.isActive) {
        const balance = await this.getBalanceWithCollaborator(userId, collaborator.id);
        // Solo incluir si hay balance diferente de 0
        if (balance.netBalance !== 0) {
          balance.collaboratorInfo = collaborator
          balances.push(balance);
        }
      }
    }

    return balances;
  };

  public deleteTransaction = async (id: number): Promise<void> => {
    await this.transactionAccessService.delete(id);
  };

  public settleTransaction = async (transactionId: number): Promise<void> => {
    const splits = await this.splitAccessService.getByTransaction(transactionId);
    
    for (const split of splits) {
      if (!split.isSettled) {
        await this.splitAccessService.markAsSettled(split.id);
      }
    }
  };

  // ========== Métodos Privados de Validación ==========
  private validateReimbursement(totalAmount: number, reimbursement: ReimbursementRequest | null): void {
    if (reimbursement) {
      if (reimbursement.amount <= 0) {
        throw new BadRequestException('El monto del reintegro debe ser mayor a 0');
      }

      if (reimbursement.amount > totalAmount) {
        throw new BadRequestException(
          `El reintegro (${reimbursement.amount}) no puede ser mayor al monto total (${totalAmount})`,
        );
      }
    }
  }

  private validateSplitsStructure(splits: TransactionSplitRequest[], userId: number, collaboratorId: number): void {
    if (splits.length !== 2) {
      throw new BadRequestException('Debe haber exactamente 2 participantes (usuario y colaborador)');
    }

    const userSplits = splits.filter(x => x.participantType === ParticipantType.User);
    const collaboratorSplits = splits.filter(x => x.participantType === ParticipantType.Collaborator);

    if (userSplits.length !== 1 || collaboratorSplits.length !== 1) {
      throw new BadRequestException('Debe haber un split para el usuario y otro para el colaborador');
    }

    const userSplit = userSplits[0];
    if (userSplit.userId && userSplit.userId !== userId) {
      throw new NotFoundException('El userId del split no coincide con el usuario de la transacción');
    }

    const collaboratorSplit = collaboratorSplits[0];
    if (collaboratorSplit.collaboratorId && collaboratorSplit.collaboratorId !== collaboratorId) {
      throw new NotFoundException(
        'El collaboratorId del split no coincide con el colaborador de la transacción',
      );
    }
  }

  private validatePayer(
    splits: TransactionSplitRequest[],
    whoPaid: string,
    userId: number,
    collaboratorId: number,
  ): void {
    const payers = splits.filter(x => x.isPayer);

    if (payers.length !== 1) {
      throw new BadRequestException('Debe haber exactamente un pagador');
    }

    const payer = payers[0];

    if (whoPaid === WhoPaid.USER && payer.participantType !== ParticipantType.User) {
      throw new BadRequestException('El pagador debe ser el usuario según whoPaid');
    }

    if (whoPaid === WhoPaid.COLLABORATOR && payer.participantType !== ParticipantType.Collaborator) {
      throw new BadRequestException('El pagador debe ser el colaborador según whoPaid');
    }

    const nonPayers = splits.filter(x => !x.isPayer);
    if (nonPayers.length !== 1) {
      throw new BadRequestException('Solo debe haber un pagador');
    }
  }

  private validateSplitsTotal(splits: TransactionSplitRequest[], amountToSplit: number): void {
    const splitsTotal = splits.reduce((sum, split) => sum + split.amount, 0);

    if (Math.abs(splitsTotal - amountToSplit) > 0.01) {
      throw new BadRequestException(
        `La suma de los splits (${splitsTotal}) debe coincidir con el monto a dividir (${amountToSplit})`,
      );
    }

    if (splits.some(x => x.amount < 0)) {
      throw new BadRequestException('Los montos de los splits no pueden ser negativos');
    }
  }

  // ========== Métodos Privados de Helpers ==========

  private async createSplits(transactionId: number, splits: TransactionSplitRequest[]): Promise<void> {
    for (const split of splits) {
      const accessRequest = new CreateTransactionSplitAccessRequest(
        transactionId,
        split.participantType === ParticipantType.Collaborator ? split.collaboratorId : null,
        split.participantType === ParticipantType.User ? split.userId : null,
        split.amount,
        split.sharePercentage,
        split.isPayer,
      );
      await this.splitAccessService.create(accessRequest);
    }
  }

  private async calculateBalanceFromMyTransactions(userId: number, collaboratorId: number): Promise<BalanceModel> {
    const myTransactions = await this.transactionAccessService.getByUserAndCollaborator(
      userId,
      collaboratorId,
    );

    let userOwes = 0;
    let collaboratorOwes = 0;

    for (const tx of myTransactions) {
      const splits = await this.splitAccessService.getByTransaction(tx.id);

      for (const split of splits) {
        // ✅ CORRECCIÓN: Solo splits NO liquidados, NO pagadores, y con monto > 0
        if (!split.isSettled && !split.isPayer && split.amount > 0) {
          if (split.collaboratorId === collaboratorId) {
            collaboratorOwes += split.amount;
          }
          if (split.userId === userId) {
            userOwes += split.amount;
          }
        }
      }
    }

    const netBalance = collaboratorOwes - userOwes;

    return new BalanceModel(
      userId,
      collaboratorId,
      netBalance < 0 ? Math.abs(netBalance) : 0,
      netBalance > 0 ? netBalance : 0,
      netBalance,
    );
  }

  // ========== Mappers ==========
  private async mapToMyView(
    transaction: TransactionMatchModel,
    userId: number,
    createdByMe: boolean,
  ): Promise<TransactionViewModel> {
    const splits = await this.splitAccessService.getByTransaction(transaction.id);
    const collaborator = await this.collaboratorAccessService.getById(
      transaction.collaboratorId,
      userId,
    );

    const mySplit = splits.find(x => x.userId === userId);
    const theirSplit = splits.find(x => x.collaboratorId === transaction.collaboratorId);
    const myCollaborator = new CollaboratorSummaryModel(
        collaborator.id,
        collaborator.name,
        collaborator.surname,
        collaborator.email,
    );
    return new TransactionViewModel(
      transaction.id,
      transaction.description,
      transaction.totalAmount,
      transaction.totalReimbursement,
      transaction.netAmount,
      myCollaborator,
      transaction.whoPaid,
      transaction.whoPaid === WhoPaid.USER ? transaction.totalAmount : 0,
      mySplit && !mySplit.isPayer ? mySplit.amount : 0,
      theirSplit && !theirSplit.isPayer ? theirSplit.amount : 0,
      transaction.whoPaid === WhoPaid.COLLABORATOR ? transaction.totalAmount : 0,
      transaction.transactionDate,
      splits.every(x => x.isSettled),
      createdByMe
    );
  }

  private async mapToTheirView(
    transaction: TransactionMatchModel,
    myUserId: number,
    createdByMe: boolean,
  ): Promise<TransactionViewModel> {
    const splits = await this.splitAccessService.getByTransaction(transaction.id);

    const myCollaborator = await this.collaboratorAccessService.getById(
      transaction.matchInfo.myCollaboratorId,
      myUserId,
    );

    const mySplit = splits.find(x => x.collaboratorId === transaction.matchInfo.theirCollaboratorId);
    const theirSplit = splits.find(x => x.userId === transaction.matchInfo.otherUserId);
    const collaboratorSummary = new CollaboratorSummaryModel(
      myCollaborator.id,
      myCollaborator.name,
      myCollaborator.surname,
      myCollaborator.email,
    )
    return new TransactionViewModel(
      transaction.id,
      transaction.description,
      transaction.totalAmount,
      transaction.totalReimbursement,
      transaction.netAmount,
      collaboratorSummary,
      transaction.whoPaid,
      mySplit?.isPayer ? transaction.totalAmount : 0,
      mySplit && !mySplit.isPayer ? mySplit.amount : 0,
      theirSplit && !theirSplit.isPayer ? theirSplit.amount : 0,
      theirSplit?.isPayer ? transaction.totalAmount : 0,
      transaction.transactionDate,
      splits.every(x => x.isSettled),
      createdByMe,
    );
  }

  private mapToModel(accessModel: TransactionAccessModel): TransactionModel {
    return new TransactionModel(
      accessModel.id,
      accessModel.userId,
      accessModel.collaboratorId,
      accessModel.totalAmount,
      accessModel.description,
      accessModel.splitType,
      accessModel.whoPaid,
      accessModel.totalReimbursement,
      accessModel.netAmount,
      accessModel.transactionDate,
    );
  }

  private mapToReimbursementManagerModel(accessModel: TransactionReimbursementAccessModel): TransactionReimbursementModel {
    return new TransactionReimbursementModel(
      accessModel.id,
      accessModel.transactionId,
      accessModel.amount,
      accessModel.description,
      accessModel.reimbursementDate,
    );
  }
}