import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from "@angular/router";
import { useAuthStore } from "../store";
import { inject } from "@angular/core";

export const guestGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const authStore = useAuthStore();
  const router = inject(Router);

  if (!authStore.isLoggedIn()) {
    return true;
  }

  router.navigate(['']);
  return false;
};