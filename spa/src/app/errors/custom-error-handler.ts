import { ErrorHandler, Injectable, inject, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AlertService, LocalService } from '../services';
import { useAuthStore } from '../store';
import { AuthStore } from '../store/auth.store';

@Injectable({
  providedIn: 'root'
})
export class CustomErrorHandler implements ErrorHandler {
  private injector = inject(Injector);
  private authStore = inject(AuthStore);
  private handlingSessionExpiry = false;

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

  private handleSessionExpiry(): void {
    if (this.handlingSessionExpiry) return;
    this.handlingSessionExpiry = true;
    this.localService.cleanCredentials();
    this.authStore.logout();
    localStorage.setItem('theme', 'light');
    this.alertService.showError(this.translate.instant('auth.sessionExpired'));
    this.router.navigate(['/login']).then(() => {
      this.handlingSessionExpiry = false;
    });
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
          this.handleSessionExpiry();
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
            if (error.message === 'Invalid Token') {
              this.handleSessionExpiry();
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