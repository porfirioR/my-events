import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { BaseAccessService, DbContextService } from '.';
import { TableEnum } from '../../../utility/enums';
import {
  ILoanInstallmentAccessService,
  LoanInstallmentAccessModel,
  CreateLoanInstallmentAccessRequest,
} from '../../contract/loans';
import { LoanInstallmentEntity } from '../entities/loan-installment.entity';

@Injectable()
export class LoanInstallmentAccessService extends BaseAccessService implements ILoanInstallmentAccessService {
  constructor(dbContextService: DbContextService) {
    super(dbContextService);
  }

  public createMany = async (requests: CreateLoanInstallmentAccessRequest[]): Promise<LoanInstallmentAccessModel[]> => {
    const rows = requests.map(r => ({
      loanid: r.loanId,
      installmentnumber: r.installmentNumber,
      duedate: r.dueDate ? r.dueDate.toISOString().split('T')[0] : null,
      totalamount: r.totalAmount,
      principalamount: r.principalAmount,
      interestamount: r.interestAmount,
      remainingbalance: r.remainingBalance,
      statusid: 1,
    }));

    const { data, error } = await this.dbContext
      .from(TableEnum.LoanInstallments)
      .insert(rows)
      .select();

    if (error) throw new InternalServerErrorException(error.message);
    return (data as LoanInstallmentEntity[]).map(this.mapEntityToModel);
  };

  public getByLoanId = async (loanId: number): Promise<LoanInstallmentAccessModel[]> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.LoanInstallments)
      .select('*')
      .eq('loanid', loanId)
      .order('installmentnumber', { ascending: true });

    if (error) throw new InternalServerErrorException(error.message);
    return (data as LoanInstallmentEntity[] ?? []).map(this.mapEntityToModel);
  };

  public markAsPaid = async (id: number, paidAmount: number): Promise<LoanInstallmentAccessModel> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.LoanInstallments)
      .update({ statusid: 2, paiddate: new Date().toISOString(), paidamount: paidAmount })
      .eq('id', id)
      .select()
      .single<LoanInstallmentEntity>();

    if (error) throw new InternalServerErrorException(error.message);
    return this.mapEntityToModel(data);
  };

  public markAsSkipped = async (id: number): Promise<LoanInstallmentAccessModel> => {
    const { data, error } = await this.dbContext
      .from(TableEnum.LoanInstallments)
      .update({ statusid: 3 })
      .eq('id', id)
      .select()
      .single<LoanInstallmentEntity>();

    if (error) throw new InternalServerErrorException(error.message);
    return this.mapEntityToModel(data);
  };

  private mapEntityToModel = (entity: LoanInstallmentEntity): LoanInstallmentAccessModel =>
    new LoanInstallmentAccessModel(
      entity.id,
      entity.loanid,
      entity.installmentnumber,
      entity.duedate ? new Date(entity.duedate) : null,
      entity.totalamount,
      entity.principalamount,
      entity.interestamount,
      entity.remainingbalance,
      entity.statusid,
      entity.paiddate ? new Date(entity.paiddate) : null,
      entity.paidamount,
    );
}
