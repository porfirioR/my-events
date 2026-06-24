import { CreateLoanInstallmentAccessRequest } from './create-loan-installment-access-request';
import { LoanInstallmentAccessModel } from './loan-installment-access.model';

export interface ILoanInstallmentAccessService {
  createMany(requests: CreateLoanInstallmentAccessRequest[]): Promise<LoanInstallmentAccessModel[]>;
  getByLoanId(loanId: number): Promise<LoanInstallmentAccessModel[]>;
  markAsPaid(id: number, paidAmount: number): Promise<LoanInstallmentAccessModel>;
  markAsSkipped(id: number): Promise<LoanInstallmentAccessModel>;
}
