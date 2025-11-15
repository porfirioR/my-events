import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { AlertService } from '../services';
import { UpsertTransactionComponent } from '../components/upsert-transaction/upsert-transaction.component';
import { UpsertCollaboratorComponent } from '../components/upsert-collaborator/upsert-collaborator.component';
import { CollaboratorMatchRequestsComponent } from '../components/collaborator-match-requests/collaborator-match-requests.component';

export const WarningUnsavedChanges: CanDeactivateFn<
  | UpsertTransactionComponent
  | UpsertCollaboratorComponent
  | CollaboratorMatchRequestsComponent
> = (
  component:
    | UpsertTransactionComponent
    | UpsertCollaboratorComponent
    | CollaboratorMatchRequestsComponent
): boolean | Promise<boolean> => {
  const alertService = inject(AlertService);
  if (component.ignorePreventUnsavedChanges) {
    return true;
  }
  if (component.formGroup.dirty) {
    return alertService
    .showQuestionModal(
      'Unsaved changes',
      'Are you sure you want to leave? The changes you have made have not been saved.',
      'question',
    )
    .then((result) => (result.value as boolean) ?? false);
  }
  return true;
};