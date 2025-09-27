import { HttpInterceptorFn } from '@angular/common/http';
import { finalize } from 'rxjs';
import { useLoadingStore } from '../store/loading.store';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingStore =  useLoadingStore()

  loadingStore.setLoading()

  return next(req).pipe(
    finalize(() => loadingStore.setLoadingSuccess())
  );
};