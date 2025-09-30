import { HttpInterceptorFn } from '@angular/common/http'
import { environment } from '../../environments/environment';

export const urlInterceptor: HttpInterceptorFn = (request, next) => {
  const baseUrl: string = environment.baseUrl;
  const apiUrl = `${baseUrl}${request.url}`;
  const req = request.clone({ url: apiUrl });
  return next(req);
}