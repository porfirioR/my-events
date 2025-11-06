import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { useAuthStore } from '../store';

export const authGuard: CanActivateFn = (route, state) => {
  const authStore = useAuthStore();
  const router = inject(Router);

  if (authStore.needsEmailVerification()) {
    router.navigate(['/verify-email-pending']);
    return false;
  }

  if (authStore.isLoggedIn()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};