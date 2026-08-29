import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, retry, throwError, timer } from 'rxjs';
import { useLoadingStore } from '../store';
import { inject } from '@angular/core';
import { CustomErrorHandler } from '../errors/custom-error-handler';

export const catchErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const loadingStore = useLoadingStore();
  const errorHandler = inject(CustomErrorHandler);

  return next(request).pipe(
    retry({
      count: 2,
      delay: (error, retryCount) => {
        // Un token vencido/inválido no se arregla reintentando — propagar de una
        // para no triplicar los 401 en el network tab y disparar el logout antes.
        if (error?.status === 401 || error?.status === 403) {
          return throwError(() => error);
        }
        return timer(300 * retryCount);
      }
    }),
    catchError((error) => {
      loadingStore.setLoadingFailed();
      errorHandler.handleError(error);
      return throwError(() => error);
    })
  );
};
