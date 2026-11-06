import { UpsertUserFinancialSettingsAccessRequest } from './upsert-user-financial-settings-access-request';
import { UserFinancialSettingsAccessModel } from './user-financial-settings-access.model';

export interface IUserFinancialSettingsAccessService {
  // null si el usuario todavía no cargó sus parámetros
  getByUserId(userId: number): Promise<UserFinancialSettingsAccessModel | null>;
  // Una fila por usuario: crea o actualiza
  upsert(request: UpsertUserFinancialSettingsAccessRequest): Promise<UserFinancialSettingsAccessModel>;
}
