import { ErrorHandler, Injectable, inject, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AlertService, LocalService } from '../services';
import { useAuthStore } from '../store';

@Injectable({
  providedIn: 'root'
})
export class CustomErrorHandler implements ErrorHandler {
  private injector = inject(Injector);

  private get alertService(): AlertService {
    return this.injector.get(AlertService);
  }

  private get localService(): LocalService {
    return this.injector.get(LocalService);
  }

  private get router(): Router {
    return this.injector.get(Router);
  }

  private get translate(): TranslateService {
    return this.injector.get(TranslateService);
  }

  private get authStore() {
    return useAuthStore();
  }

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
        if (error.status === 403 || error.status === 401) {
          this.alertService.showError(this.translate.instant('auth.sessionExpired'));
          this.authStore.logout();
          this.router.navigate(['/login']);
        } else {
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
              this.localService.cleanCredentials();
              this.authStore.logout();
              this.alertService.showError(this.translate.instant('auth.sessionExpired'));
              localStorage.setItem('theme', 'light');
              this.router.navigate(['/login']);
              return;
            }
            additionalMessage = error.message;
          }

          this.alertService.showError(additionalMessage);
        }
      }
    } else {
      this.alertService.showError(`ERROR - ${JSON.stringify(error)}`);
    }
  }
}