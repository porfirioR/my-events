import { LoanEntityTermAccessModel } from './loan-entity-term-access.model';

export interface ILoanEntityTermAccessService {
  getAll(): Promise<LoanEntityTermAccessModel[]>;
  getByEntityId(entityId: number): Promise<LoanEntityTermAccessModel[]>;
}
