import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, retry, throwError, timer } from 'rxjs';
import { useLoadingStore } from '../store';
import { inject } from '@angular/core';
import { CustomErrorHandler } from '../errors/custom-error-handler';

// Solo se reintentan métodos idempotentes: reintentar un POST/PUT/PATCH/DELETE que
// el servidor ya procesó duplica la operación o devuelve un error engañoso
// (ej. sign-up crea el usuario, falla el email y el reintento dice "mail ya registrado").
const RETRYABLE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

export const catchErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const loadingStore = useLoadingStore();
  const errorHandler = inject(CustomErrorHandler);
  const retryCount = RETRYABLE_METHODS.includes(request.method.toUpperCase()) ? 2 : 0;

  return next(request).pipe(
    retry({
      count: retryCount,
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
