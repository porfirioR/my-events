import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { LOAN_TOKENS } from '../../utility/constants/injection-tokens.const';
import {
  ILoanAccessService,
  ILoanInstallmentAccessService,
  ILoanPaymentAccessService,
  ILoanEntityTermAccessService,
  CreateLoanAccessRequest,
  UpdateLoanAccessRequest,
  CreateLoanInstallmentAccessRequest,
  CreateLoanPaymentAccessRequest,
  LoanAccessModel,
} from '../../access/contract/loans';
import {
  LoanModel,
  LoanInstallmentModel,
  LoanPaymentModel,
  LoanEntityTermModel,
  CreateLoanRequest,
  UpdateLoanRequest,
  PayLoanInstallmentRequest,
} from '../models/loans';
import { LoanCalculatorHelper } from '../../utility/helpers/loan-calculator.helper';
import { SavingsCalculatorHelper } from '../../utility/helpers/savings-calculator.helper';

@Injectable()
export class LoanManagerService {
  constructor(
    @Inject(LOAN_TOKENS.LOAN_ACCESS_SERVICE)
    private readonly loanAccessService: ILoanAccessService,

    @Inject(LOAN_TOKENS.INSTALLMENT_ACCESS_SERVICE)
    private readonly installmentAccessService: ILoanInstallmentAccessService,

    @Inject(LOAN_TOKENS.PAYMENT_ACCESS_SERVICE)
    private readonly paymentAccessService: ILoanPaymentAccessService,

    @Inject(LOAN_TOKENS.ENTITY_TERM_ACCESS_SERVICE)
    private readonly loanEntityTermAccessService: ILoanEntityTermAccessService,
  ) {}

  // ==================== ENTITY TERMS ====================

  public getEntityTerms = async (): Promise<LoanEntityTermModel[]> => {
    const terms = await this.loanEntityTermAccessService.getAll();
    return terms.map(t => new LoanEntityTermModel(t.id, t.loanEntityId, t.termMonths, t.annualRatePercentage));
  };

  // ==================== LOANS ====================

  public createLoan = async (request: CreateLoanRequest): Promise<LoanModel> => {
    const calc = LoanCalculatorHelper.calculate(
      request.principalAmount,
      request.annualRatePercentage,
      request.numberOfInstallments,
      request.amortizationType,
      request.startDate,
    );

    const actualInstallment = request.actualInstallmentAmount ?? calc.calculatedInstallmentAmount;
    const actualTotal = request.actualTotalAmount ?? calc.calculatedTotalAmount;

    const expectedEndDate = SavingsCalculatorHelper.addMonths(request.startDate, request.numberOfInstallments - 1);

    const accessRequest = new CreateLoanAccessRequest(
      request.userId,
      request.currencyId,
      request.loanTypeId,
      request.loanEntityId,
      request.lenderCustomName,
      request.name,
      request.description,
      request.principalAmount,
      request.annualRatePercentage,
      request.numberOfInstallments,
      calc.calculatedInstallmentAmount,
      calc.calculatedTotalInterest,
      calc.calculatedTotalAmount,
      actualInstallment,
      actualTotal,
      request.principalAmount,
      request.amortizationType,
      request.startDate,
      expectedEndDate,
    );

    const loan = await this.loanAccessService.create(accessRequest);

    const installmentRequests = calc.schedule.map(s =>
      new CreateLoanInstallmentAccessRequest(
        loan.id,
        s.installmentNumber,
        s.dueDate,
        s.totalAmount,
        s.principalAmount,
        s.interestAmount,
        s.remainingBalance,
      )
    );
    await this.installmentAccessService.createMany(installmentRequests);

    return this.mapToModel(loan);
  };

  public getAllLoans = async (userId: number): Promise<LoanModel[]> => {
    const loans = await this.loanAccessService.getAll(userId);
    return loans.map(this.mapToModel);
  };

  public getLoanById = async (id: number, userId: number): Promise<LoanModel> => {
    const loan = await this.loanAccessService.getById(id, userId);
    return this.mapToModel(loan);
  };

  public updateLoan = async (request: UpdateLoanRequest): Promise<LoanModel> => {
    const accessRequest = new UpdateLoanAccessRequest(
      request.id,
      request.userId,
      request.name,
      request.description,
      request.loanTypeId,
      request.statusId,
    );
    const loan = await this.loanAccessService.update(accessRequest);
    return this.mapToModel(loan);
  };

  public deleteLoan = async (id: number, userId: number): Promise<void> => {
    await this.loanAccessService.delete(id, userId);
  };

  // ==================== INSTALLMENTS ====================

  public getInstallmentsByLoanId = async (loanId: number, userId: number): Promise<LoanInstallmentModel[]> => {
    await this.loanAccessService.getById(loanId, userId);
    const installments = await this.installmentAccessService.getByLoanId(loanId);
    return installments.map(this.mapInstallmentToModel);
  };

  public payInstallment = async (request: PayLoanInstallmentRequest): Promise<LoanPaymentModel> => {
    const loan = await this.loanAccessService.getById(request.loanId, request.userId);
    const installments = await this.installmentAccessService.getByLoanId(request.loanId);
    const installment = installments.find(i => i.id === request.installmentId);

    if (!installment) throw new NotFoundException(`Installment ${request.installmentId} not found`);
    if (installment.statusId !== 1) throw new BadRequestException('Installment is not in pending status');
    if (request.amount < 1) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    await this.installmentAccessService.markAsPaid(request.installmentId, request.amount, request.paymentDate);

    const newTotalPaid = loan.totalPaid + request.amount;
    const newBalance = Math.max(loan.currentBalance - installment.principalAmount, 0);
    await this.loanAccessService.updateBalance(request.loanId, request.userId, newBalance, newTotalPaid);

    const paymentAccessRequest = new CreateLoanPaymentAccessRequest(
      request.loanId,
      request.installmentId,
      request.amount,
      request.description,
      request.paymentDate,
    );
    const payment = await this.paymentAccessService.create(paymentAccessRequest);
    return this.mapPaymentToModel(payment);
  };

  public skipInstallment = async (installmentId: number, loanId: number, userId: number): Promise<LoanInstallmentModel> => {
    await this.loanAccessService.getById(loanId, userId);
    const updated = await this.installmentAccessService.markAsSkipped(installmentId);
    return this.mapInstallmentToModel(updated);
  };

  // ==================== PAYMENTS ====================

  public getPaymentsByLoanId = async (loanId: number, userId: number): Promise<LoanPaymentModel[]> => {
    await this.loanAccessService.getById(loanId, userId);
    const payments = await this.paymentAccessService.getByLoanId(loanId);
    return payments.map(this.mapPaymentToModel);
  };

  // ==================== MAPPERS ====================

  private mapToModel = (loan: LoanAccessModel): LoanModel =>
    new LoanModel(
      loan.id,
      loan.userId,
      loan.currencyId,
      loan.loanTypeId,
      loan.loanEntityId,
      loan.lenderCustomName,
      loan.name,
      loan.description,
      loan.principalAmount,
      loan.annualRatePercentage,
      loan.numberOfInstallments,
      loan.calculatedInstallmentAmount,
      loan.actualInstallmentAmount,
      loan.calculatedTotalInterest,
      loan.calculatedTotalAmount,
      loan.actualTotalAmount,
      loan.currentBalance,
      loan.totalPaid,
      loan.amortizationType,
      loan.statusId,
      loan.startDate,
      loan.expectedEndDate,
      loan.completedDate,
      loan.paidInstallmentsCount,
    );

  private mapInstallmentToModel = (i: any): LoanInstallmentModel =>
    new LoanInstallmentModel(
      i.id, i.loanId, i.installmentNumber, i.dueDate,
      i.totalAmount, i.principalAmount, i.interestAmount,
      i.remainingBalance, i.statusId, i.paidDate, i.paidAmount,
    );

  private mapPaymentToModel = (p: any): LoanPaymentModel =>
    new LoanPaymentModel(p.id, p.loanId, p.installmentId, p.amount, p.description, p.paymentDate);
}
