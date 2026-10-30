import { CreateFinancialInstitutionAccessRequest } from './create-financial-institution-access-request';
import { UpdateFinancialInstitutionAccessRequest } from './update-financial-institution-access-request';
import { FinancialInstitutionAccessModel } from './financial-institution-access.model';

export interface IFinancialInstitutionAccessService {
  create(request: CreateFinancialInstitutionAccessRequest): Promise<FinancialInstitutionAccessModel>;
  getById(id: number, userId: number): Promise<FinancialInstitutionAccessModel>;
  // Solo el nombre, sin filtrar por usuario: para mostrar la entidad que eligió otro miembro
  getNameById(id: number): Promise<string | null>;
  getAll(userId: number): Promise<FinancialInstitutionAccessModel[]>;
  update(request: UpdateFinancialInstitutionAccessRequest): Promise<FinancialInstitutionAccessModel>;
  delete(id: number, userId: number): Promise<void>;
}
