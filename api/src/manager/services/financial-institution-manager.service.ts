import { Inject, Injectable } from '@nestjs/common';
import { FINANCIAL_INSTITUTION_TOKENS } from '../../utility/constants/injection-tokens.const';
import {
  IFinancialInstitutionAccessService,
  CreateFinancialInstitutionAccessRequest,
  UpdateFinancialInstitutionAccessRequest,
  FinancialInstitutionAccessModel,
} from '../../access/contract/financial-institutions';
import {
  FinancialInstitutionModel,
  CreateFinancialInstitutionRequest,
  UpdateFinancialInstitutionRequest,
} from '../models/financial-institutions';

@Injectable()
export class FinancialInstitutionManagerService {
  constructor(
    @Inject(FINANCIAL_INSTITUTION_TOKENS.ACCESS_SERVICE)
    private readonly financialInstitutionAccessService: IFinancialInstitutionAccessService,
  ) {}

  public createFinancialInstitution = async (request: CreateFinancialInstitutionRequest): Promise<FinancialInstitutionModel> => {
    const accessRequest = new CreateFinancialInstitutionAccessRequest(
      request.userId,
      request.name.trim(),
      request.type,
    );
    const financialInstitution = await this.financialInstitutionAccessService.create(accessRequest);
    return this.mapToModel(financialInstitution);
  };

  public getAllFinancialInstitutions = async (userId: number): Promise<FinancialInstitutionModel[]> => {
    const financialInstitutions = await this.financialInstitutionAccessService.getAll(userId);
    return financialInstitutions.map(this.mapToModel);
  };

  public updateFinancialInstitution = async (request: UpdateFinancialInstitutionRequest): Promise<FinancialInstitutionModel> => {
    const accessRequest = new UpdateFinancialInstitutionAccessRequest(
      request.id,
      request.userId,
      request.name.trim(),
      request.type,
    );
    const financialInstitution = await this.financialInstitutionAccessService.update(accessRequest);
    return this.mapToModel(financialInstitution);
  };

  public deleteFinancialInstitution = async (id: number, userId: number): Promise<void> => {
    await this.financialInstitutionAccessService.delete(id, userId);
  };

  private mapToModel = (financialInstitution: FinancialInstitutionAccessModel): FinancialInstitutionModel =>
    new FinancialInstitutionModel(
      financialInstitution.id,
      financialInstitution.userId,
      financialInstitution.name,
      financialInstitution.isOther,
      financialInstitution.type,
    );
}
