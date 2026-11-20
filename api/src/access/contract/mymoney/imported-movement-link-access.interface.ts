import { ImportedMovementLinkAccessModel } from './imported-movement-link-access.model';

export interface InstallmentLinkRequest {
  savingsInstallmentId: number | null;
  loanInstallmentId: number | null;
}

export interface IImportedMovementLinkAccessService {
  getAll(userId: number): Promise<ImportedMovementLinkAccessModel[]>;
  // Reemplaza las cuotas conciliadas con el movimiento (lista vacía = deshacer la conciliación)
  replaceForMovement(userId: number, importedMovementId: number, links: InstallmentLinkRequest[]): Promise<void>;
}
