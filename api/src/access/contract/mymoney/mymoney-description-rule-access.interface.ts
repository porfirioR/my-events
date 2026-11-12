import { MyMoneyDescriptionRuleAccessModel } from './mymoney-description-rule-access.model';
import { UpsertMyMoneyDescriptionRuleAccessRequest } from './upsert-mymoney-description-rule-access-request';

export interface IMyMoneyDescriptionRuleAccessService {
  getAll(userId: number): Promise<MyMoneyDescriptionRuleAccessModel[]>;
  create(request: UpsertMyMoneyDescriptionRuleAccessRequest): Promise<MyMoneyDescriptionRuleAccessModel>;
  update(request: UpsertMyMoneyDescriptionRuleAccessRequest): Promise<MyMoneyDescriptionRuleAccessModel>;
  delete(id: number, userId: number): Promise<void>;
}
