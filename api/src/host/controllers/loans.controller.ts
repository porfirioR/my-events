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
import { LoanManagerService } from '../../manager/services/loan-manager.service';
import { LOAN_TOKENS } from '../../utility/constants/injection-tokens.const';
import {
  LoanModel,
  LoanInstallmentModel,
  LoanPaymentModel,
  LoanEntityTermModel,
  CreateLoanRequest,
  UpdateLoanRequest,
  PayLoanInstallmentRequest,
} from '../../manager/models/loans';
import {
  CreateLoanApiRequest,
  UpdateLoanApiRequest,
  PayLoanInstallmentApiRequest,
} from '../models/loans';
import { MessageModel } from '../models/message.model';
import { AmortizationType } from '../../utility/enums/amortization-type.enum';

@Controller('loans')
@UseGuards(PrivateEndpointGuard)
export class LoansController {
  constructor(
    private readonly currentUserService: CurrentUserService,

    @Inject(LOAN_TOKENS.MANAGER_SERVICE)
    private readonly loanManagerService: LoanManagerService,
  ) {}

  // ==================== ENTITY TERMS ====================

  @Get('entity-terms')
  async getEntityTerms(): Promise<LoanEntityTermModel[]> {
    return await this.loanManagerService.getEntityTerms();
  }

  // ==================== LOANS ====================

  @Get()
  async getAllLoans(): Promise<LoanModel[]> {
    const userId = await this.currentUserService.getCurrentUserId();
    return await this.loanManagerService.getAllLoans(userId);
  }

  @Get(':id')
  async getLoanById(@Param('id', ParseIntPipe) id: number): Promise<LoanModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    return await this.loanManagerService.getLoanById(id, userId);
  }

  @Post()
  async createLoan(@Body() apiRequest: CreateLoanApiRequest): Promise<LoanModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    const amortType = apiRequest.amortizationType === AmortizationType.Simple
      ? AmortizationType.Simple
      : AmortizationType.French;

    const request = new CreateLoanRequest(
      userId,
      apiRequest.currencyId,
      apiRequest.loanTypeId,
      apiRequest.loanEntityId,
      apiRequest.lenderCustomName ?? null,
      apiRequest.name,
      apiRequest.description ?? null,
      apiRequest.principalAmount,
      apiRequest.annualRatePercentage,
      apiRequest.numberOfInstallments,
      apiRequest.actualInstallmentAmount ?? null,
      apiRequest.actualTotalAmount ?? null,
      amortType,
      new Date(apiRequest.startDate),
      apiRequest.administrativeFees ?? null,
      apiRequest.ivaPercentage ?? null,
      apiRequest.insuranceAmount ?? null,
    );

    return await this.loanManagerService.createLoan(request);
  }

  @Put(':id')
  async updateLoan(
    @Param('id', ParseIntPipe) id: number,
    @Body() apiRequest: UpdateLoanApiRequest,
  ): Promise<LoanModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    const request = new UpdateLoanRequest(
      id,
      userId,
      apiRequest.name,
      apiRequest.description ?? null,
      apiRequest.loanTypeId,
      apiRequest.statusId,
      apiRequest.administrativeFees ?? null,
      apiRequest.ivaPercentage ?? null,
      apiRequest.insuranceAmount ?? null,
    );
    return await this.loanManagerService.updateLoan(request);
  }

  @Delete(':id')
  async deleteLoan(@Param('id', ParseIntPipe) id: number): Promise<MessageModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    await this.loanManagerService.deleteLoan(id, userId);
    return new MessageModel('Loan deleted successfully');
  }

  // ==================== INSTALLMENTS ====================

  @Get(':loanId/installments')
  async getInstallmentsByLoanId(
    @Param('loanId', ParseIntPipe) loanId: number,
  ): Promise<LoanInstallmentModel[]> {
    const userId = await this.currentUserService.getCurrentUserId();
    return await this.loanManagerService.getInstallmentsByLoanId(loanId, userId);
  }

  @Post(':loanId/installments/:installmentId/pay')
  async payInstallment(
    @Param('loanId', ParseIntPipe) loanId: number,
    @Param('installmentId', ParseIntPipe) installmentId: number,
    @Body() apiRequest: PayLoanInstallmentApiRequest,
  ): Promise<LoanPaymentModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    const request = new PayLoanInstallmentRequest(
      userId,
      loanId,
      installmentId,
      apiRequest.amount,
      apiRequest.description ?? null,
      apiRequest.paymentDate ? new Date(apiRequest.paymentDate) : null,
    );
    return await this.loanManagerService.payInstallment(request);
  }

  @Put(':loanId/installments/:installmentId/skip')
  async skipInstallment(
    @Param('loanId', ParseIntPipe) loanId: number,
    @Param('installmentId', ParseIntPipe) installmentId: number,
  ): Promise<LoanInstallmentModel> {
    const userId = await this.currentUserService.getCurrentUserId();
    return await this.loanManagerService.skipInstallment(installmentId, loanId, userId);
  }

  // ==================== PAYMENTS ====================

  @Get(':loanId/payments')
  async getPaymentsByLoanId(
    @Param('loanId', ParseIntPipe) loanId: number,
  ): Promise<LoanPaymentModel[]> {
    const userId = await this.currentUserService.getCurrentUserId();
    return await this.loanManagerService.getPaymentsByLoanId(loanId, userId);
  }
}
