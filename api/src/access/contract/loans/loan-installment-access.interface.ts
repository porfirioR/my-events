import { CreateLoanInstallmentAccessRequest } from './create-loan-installment-access-request';
import { LoanInstallmentAccessModel } from './loan-installment-access.model';

export interface ILoanInstallmentAccessService {
  createMany(requests: CreateLoanInstallmentAccessRequest[]): Promise<LoanInstallmentAccessModel[]>;
  getByLoanId(loanId: number): Promise<LoanInstallmentAccessModel[]>;
  // Cuotas pendientes de varios préstamos en una sola consulta, ordenadas por vencimiento
  getPendingByLoanIds(loanIds: number[]): Promise<LoanInstallmentAccessModel[]>;
  markAsPaid(id: number, paidAmount: number, paymentDate?: Date | null): Promise<LoanInstallmentAccessModel>;
  markAsSkipped(id: number): Promise<LoanInstallmentAccessModel>;
}
