import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { BaseAccessService, DbContextService } from '.';
import { TableEnum } from '../../../utility/enums';
import {
  ILoanPaymentAccessService,
  LoanPaymentAccessModel,
  CreateLoanPaymentAccessRequest,
} from '../../contract/loans';
import { LoanPaymentEntity } from '../entities/loan-payment.entity';

@Injectable()
export class LoanPaymentAccessService extends BaseAccessService implements ILoanPaymentAccessService {
  constructor(dbContextService: DbContextService) {
    super(dbContextService);
  }

  public create = async (request: CreateLoanPaymentAccessRequest): Promise<LoanPaymentAccessModel> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.LoanPayments)
      .insert({
        loanid: request.loanId,
        installmentid: request.installmentId,
        amount: request.amount,
        description: request.description,
      })
      .select()
      .single<LoanPaymentEntity>();

    if (error) throw new InternalServerErrorException(error.message);
    return this.mapEntityToModel(data);
  };

  public getByLoanId = async (loanId: number): Promise<LoanPaymentAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.LoanPayments)
      .select('*')
      .eq('loanid', loanId)
      .order('paymentdate', { ascending: false });

    if (error) throw new InternalServerErrorException(error.message);
    return (data as LoanPaymentEntity[] ?? []).map(this.mapEntityToModel);
  };

  private mapEntityToModel = (entity: LoanPaymentEntity): LoanPaymentAccessModel =>
    new LoanPaymentAccessModel(
      entity.id,
      entity.loanid,
      entity.installmentid,
      entity.amount,
      entity.description,
      new Date(entity.paymentdate),
    );
}
