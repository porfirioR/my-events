import { CreateLoanPaymentAccessRequest } from './create-loan-payment-access-request';
import { LoanPaymentAccessModel } from './loan-payment-access.model';

export interface ILoanPaymentAccessService {
  create(request: CreateLoanPaymentAccessRequest): Promise<LoanPaymentAccessModel>;
  getByLoanId(loanId: number): Promise<LoanPaymentAccessModel[]>;
}
