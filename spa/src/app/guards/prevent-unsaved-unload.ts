import { DestroyRef, inject } from '@angular/core';
import { AbstractControl } from '@angular/forms';

interface UnsavedChangesComponent {
  formGroup: AbstractControl;
  ignorePreventUnsavedChanges: boolean;
}

// canDeactivate solo cubre la navegación interna; refrescar, cerrar la pestaña o cambiar la URL
// descargan la página sin pasar por el router. El navegador muestra su aviso nativo (no personalizable).
export const preventUnsavedUnload = (component: UnsavedChangesComponent): void => {
  const handler = (event: BeforeUnloadEvent): void => {
    if (!component.ignorePreventUnsavedChanges && component.formGroup?.dirty) {
      event.preventDefault();
    }
  };
  window.addEventListener('beforeunload', handler);
  inject(DestroyRef).onDestroy(() => window.removeEventListener('beforeunload', handler));
};
