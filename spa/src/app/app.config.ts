import { ApplicationConfig, ErrorHandler, isDevMode, provideZonelessChangeDetection } from '@angular/core'
import { provideHttpClient, withInterceptors } from '@angular/common/http'
import { provideServiceWorker } from '@angular/service-worker'
import { provideRouter } from '@angular/router'
import { routes } from './app.routes'
import { headerInterceptor } from './interceptors/header.interceptor'
import { jwtInterceptor } from './interceptors/jwt.interceptor'
import { catchErrorInterceptor } from './interceptors/catch-error.interceptor'
import { CustomErrorHandler } from './errors/custom-error-handler'
import { urlInterceptor } from './interceptors/url.interceptor'
import { loadingInterceptor } from './interceptors/loading.interceptor'

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([
      urlInterceptor,
      headerInterceptor,
      jwtInterceptor,
      loadingInterceptor,
      catchErrorInterceptor,
    ])),
    {
      provide: ErrorHandler,
      useClass: CustomErrorHandler,
    },
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
}

