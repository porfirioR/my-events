import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { CurrentUserService } from '../services/current-user.service';
import { PrivateEndpointGuard } from '../guards/private-endpoint.guard';
import {
  CreateTransactionApiRequest,
  AddReimbursementApiRequest,
} from '../models/transactions';
import { MessageModel } from '../models/message.model';
import { AddReimbursementRequest, BalanceModel, CreateTransactionRequest, ITransactionManagerService, ReimbursementRequest, TransactionModel, TransactionReimbursementModel, TransactionSplitRequest, TransactionViewModel } from '../../manager/models/transactions';
import { ParticipantType, WhoPaid } from '../../utility/enums';
import { TRANSACTION_TOKENS } from 'src/utility/constants';

@Controller('transactions')
@UseGuards(PrivateEndpointGuard)
export class TransactionController {
  constructor(
    private readonly currentUserService: CurrentUserService,
    @Inject(TRANSACTION_TOKENS.MANAGER_SERVICE)
    private readonly transactionManagerService: ITransactionManagerService,
  ) {}

  /**
   * Crea una nueva transacción
   * POST /api/transactions
   */
  @Post()
  async createTransaction(@Body() apiRequest: CreateTransactionApiRequest): Promise<TransactionModel> {
    const userId = await this.currentUserService.getCurrentUserId();

    // Mapear splits del API request al manager request
    const splits = apiRequest.splits.map((split) => {
      const isPayer = this.determinePayer(split.participantType, apiRequest.whoPaid);

      return new TransactionSplitRequest(
        split.participantType,
        split.participantType === ParticipantType.User ? userId : null,
        split.participantType === ParticipantType.Collaborator ? apiRequest.collaboratorId : null,
        split.amount,
        split.sharePercentage || null,
        isPayer,
      );
    });

    // Mapear reintegro si existe
    const reimbursement = apiRequest.reimbursement
      ? new ReimbursementRequest(
          apiRequest.reimbursement.amount,
          apiRequest.reimbursement.description || null,
        )
      : null;

    // Crear el manager request
    const request = new CreateTransactionRequest(
      userId,
      apiRequest.collaboratorId,
      apiRequest.totalAmount,
      apiRequest.description || null,
      apiRequest.splitType,
      apiRequest.whoPaid,
      splits,
      reimbursement,
    );

    return await this.transactionManagerService.createTransaction(request);
  }

  /**
   * Agrega un reintegro a una transacción existente
   * POST /api/transactions/:id/reimbursements
   */
  @Post(':id/reimbursements')
  async addReimbursement(
    @Param('id', ParseIntPipe) transactionId: number,
    @Body() apiRequest: AddReimbursementApiRequest,
  ): Promise<TransactionReimbursementModel> {
    const request = new AddReimbursementRequest(
      transactionId,
      apiRequest.amount,
      apiRequest.description || null,
    );

    return await this.transactionManagerService.addReimbursement(request);
  }

  /**
   * Obtiene una transacción por ID
   * GET /api/transactions/:id
   */
  @Get(':id')
  async getTransactionById(@Param('id', ParseIntPipe) id: number): Promise<TransactionModel> {
    return await this.transactionManagerService.getTransactionById(id);
  }

  /**
   * Obtiene todas las transacciones del usuario (propias y de matches)
   * GET /api/transactions
   */
  @Get()
  async getMyTransactions(): Promise<TransactionViewModel[]> {
    const userId = await this.currentUserService.getCurrentUserId();
    return await this.transactionManagerService.getMyTransactions(userId);
  }

  /**
   * Obtiene el balance con un colaborador específico
   * GET /api/transactions/balance/:collaboratorId
   */
  @Get('balance/:collaboratorId')
  async getBalanceWithCollaborator(@Param('collaboratorId', ParseIntPipe) collaboratorId: number): Promise<BalanceModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    return await this.transactionManagerService.getBalanceWithCollaborator(
      userId,
      collaboratorId,
    );
  }

  /**
   * Obtiene todos los balances del usuario con sus colaboradores
   * GET /api/transactions/balances
   */
  @Get('balances/all')
  async getAllBalances(): Promise<BalanceModel[]> {
    const userId = await this.currentUserService.getCurrentUserId();
    return await this.transactionManagerService.getAllBalances(userId);
  }

  /**
   * Elimina una transacción
   * DELETE /api/transactions/:id
   */
  @Delete(':id')
  async deleteTransaction(@Param('id', ParseIntPipe) id: number): Promise<MessageModel> {
    await this.transactionManagerService.deleteTransaction(id);
    return new MessageModel('Transaction deleted successfully');
  }

  // ========== Métodos Privados de Helpers ==========

  private determinePayer(participantType: ParticipantType, whoPaid: WhoPaid): boolean {
    if (whoPaid === WhoPaid.USER && participantType === ParticipantType.User) {
      return true;
    }
    if (whoPaid === WhoPaid.COLLABORATOR && participantType === ParticipantType.Collaborator) {
      return true;
    }
    return false;
  }
}