import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, retry, throwError } from 'rxjs';
import { useLoadingStore } from '../store';
import { inject } from '@angular/core';
import { CustomErrorHandler } from '../errors/custom-error-handler';

export const catchErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const loadingStore = useLoadingStore();
  const errorHandler = inject(CustomErrorHandler);

  return next(request).pipe(
    retry(2),
    catchError((error) => {
      loadingStore.setLoadingFailed();
      errorHandler.handleError(error);
      return throwError(() => error);;
    })
  );
};
