import { CreateMyMoneyCategoryMappingAccessRequest } from './create-mymoney-category-mapping-access-request';
import { MyMoneyCategoryMappingAccessModel } from './mymoney-category-mapping-access.model';
import { UpdateMyMoneyCategoryMappingAccessRequest } from './update-mymoney-category-mapping-access-request';

export interface IMyMoneyCategoryMappingAccessService {
  getAll(userId: number): Promise<MyMoneyCategoryMappingAccessModel[]>;
  getById(id: number, userId: number): Promise<MyMoneyCategoryMappingAccessModel>;
  createMany(requests: CreateMyMoneyCategoryMappingAccessRequest[]): Promise<void>;
  rename(id: number, userId: number, categoryName: string): Promise<void>;
  update(request: UpdateMyMoneyCategoryMappingAccessRequest): Promise<MyMoneyCategoryMappingAccessModel>;
}
