import { ImportedMovementAccessModel } from './imported-movement-access.model';
import { UpsertImportedMovementAccessRequest } from './upsert-imported-movement-access-request';

export interface IImportedMovementAccessService {
  getAll(userId: number): Promise<ImportedMovementAccessModel[]>;
  upsertMany(requests: UpsertImportedMovementAccessRequest[]): Promise<void>;
  deleteMany(ids: number[], userId: number): Promise<void>;
}
