import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { AlertService } from '../services';

export const WarningUnsavedChanges: CanDeactivateFn<
  | any
> = (
  component:
    | any
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