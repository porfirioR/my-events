import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AlertService } from '../services';
import { UpsertTransactionComponent } from '../components/upsert-transaction/upsert-transaction.component';
import { UpsertCollaboratorComponent } from '../components/upsert-collaborator/upsert-collaborator.component';
import { CollaboratorMatchRequestsComponent } from '../components/collaborator-match-requests/collaborator-match-requests.component';
import { UpsertOperationComponent } from '../components/upsert-operation/upsert-operation.component';

export const WarningUnsavedChanges: CanDeactivateFn<
  | UpsertTransactionComponent
  | UpsertCollaboratorComponent
  | CollaboratorMatchRequestsComponent
  | UpsertOperationComponent
> = (
  component:
    | UpsertTransactionComponent
    | UpsertCollaboratorComponent
    | CollaboratorMatchRequestsComponent
    | UpsertOperationComponent
): boolean | Promise<boolean> => {
  const alertService = inject(AlertService);
  const translate = inject(TranslateService);

  if (component.ignorePreventUnsavedChanges) {
    return true;
  }

  if (component.formGroup.dirty) {
    return alertService
      .showQuestionModal(
        translate.instant('guards.unsavedChangesTitle'),
        translate.instant('guards.unsavedChangesMessage'),
        'question',
      )
      .then((result) => (result.value as boolean) ?? false);
  }

  return true;
};