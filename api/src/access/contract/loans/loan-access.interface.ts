import { CreateLoanAccessRequest } from './create-loan-access-request';
import { UpdateLoanAccessRequest } from './update-loan-access-request';
import { LoanAccessModel } from './loan-access.model';

export interface ILoanAccessService {
  create(request: CreateLoanAccessRequest): Promise<LoanAccessModel>;
  getById(id: number, userId: number): Promise<LoanAccessModel>;
  getAll(userId: number): Promise<LoanAccessModel[]>;
  update(request: UpdateLoanAccessRequest): Promise<LoanAccessModel>;
  updateBalance(id: number, userId: number, currentBalance: number, totalPaid: number): Promise<LoanAccessModel>;
  markAsCompleted(id: number, userId: number): Promise<LoanAccessModel>;
  delete(id: number, userId: number): Promise<void>;
}
