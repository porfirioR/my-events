import { AccountAccessModel } from './account-access.model';
import { CreateAccountAccessRequest } from './create-account-access-request';
import { UpdateAccountAccessRequest } from './update-account-access-request';

export interface IAccountAccessService {
  create(request: CreateAccountAccessRequest): Promise<AccountAccessModel>;
  getById(id: number, userId: number): Promise<AccountAccessModel>;
  getAll(userId: number): Promise<AccountAccessModel[]>;
  update(request: UpdateAccountAccessRequest): Promise<AccountAccessModel>;
  delete(id: number, userId: number): Promise<void>;
}
