// errors/custom-error-handler.ts
import { ErrorHandler, Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AlertService, LocalService } from '../services';
import { useAuthStore } from '../store';

@Injectable({
  providedIn: 'root'
})
export class CustomErrorHandler implements ErrorHandler {
  private alertService = inject(AlertService);
  private localService = inject(LocalService)
  private router = inject(Router);
  // ✅ Usar AuthStore en lugar de LocalService
  private authStore = useAuthStore();

  handleError(error: any): void {
    console.error('Global Error Handler:', error);

    if (typeof error === 'string') {
      this.alertService.showError(error);
      return;
    } 

    if (error && error.error) {
      error = error.error;

      if (error && error.type === 'HandledError') {
        this.alertService.showError(`${error.status} - ${error.title}`);
      } else if (error && error.status) {
        let additionalMessage = '';

        if (error.errors) {
          for(const key in error.errors) {
            const child = error.errors[key];
            additionalMessage = `- ${child.join('. ')}`;
          }
        } else if (error.title) {
          additionalMessage = error.title;
        } else if (error.message) {
          // ✅ Manejar JWT expirado con AuthStore
          if (error.message === 'Invalid Token') {
            this.localService.cleanCredentials()
            this.authStore.logout();
            this.alertService.showError('Your session has expired. Please login again.');
            localStorage.setItem('theme', 'light')
            this.router.navigate(['/login']);
            return;
          }
          additionalMessage = error.message;
        }

        this.alertService.showError(additionalMessage);
      }
    } else if (error.status === 403 || error.status === 401) {
      // ✅ Manejar 401/403 con logout
      this.alertService.showError(`FORBIDDEN - ${error.message}`);
      this.authStore.logout();
      this.router.navigate(['/login']);
    } else {
      this.alertService.showError(`ERROR - ${JSON.stringify(error)}`);
    }
  }
}