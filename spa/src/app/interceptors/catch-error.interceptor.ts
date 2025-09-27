import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, retry } from 'rxjs';
import { useLoadingStore } from '../store';

export const catchErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const loadingStore = useLoadingStore();

  return next(request).pipe(
    retry(2),
    catchError((error) => {
      loadingStore.setLoadingFailed();
      throw error;
    })
  );
};
