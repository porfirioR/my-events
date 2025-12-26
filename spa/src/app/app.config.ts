import {
  ApplicationConfig,
  ErrorHandler,
  importProvidersFrom,
  isDevMode,
  provideZonelessChangeDetection,
} from '@angular/core';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import { provideRouter, TitleStrategy } from '@angular/router';
import { routes } from './app.routes';
import { headerInterceptor } from './interceptors/header.interceptor';
import { jwtInterceptor } from './interceptors/jwt.interceptor';
import { catchErrorInterceptor } from './interceptors/catch-error.interceptor';
import { CustomErrorHandler } from './errors/custom-error-handler';
import { urlInterceptor } from './interceptors/url.interceptor';
import { loadingInterceptor } from './interceptors/loading.interceptor';
import { provideTranslateService } from '@ngx-translate/core';
import {provideTranslateHttpLoader} from "@ngx-translate/http-loader";
import { AppTitleStrategy } from './services';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([
        headerInterceptor,
        jwtInterceptor,
        loadingInterceptor,
        catchErrorInterceptor,
        urlInterceptor,
      ])
    ),
    { provide: TitleStrategy, useClass: AppTitleStrategy },
    {
      provide: ErrorHandler,
      useClass: CustomErrorHandler,
    },
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideTranslateService({
      fallbackLang: 'en',
      loader: provideTranslateHttpLoader({
        prefix: './assets/i18n/',
        suffix: '.json'
      })
    }),
  ],
};

