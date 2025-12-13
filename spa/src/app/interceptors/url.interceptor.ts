import { HttpInterceptorFn } from '@angular/common/http'
import { environment } from '../../environments/environment';

export const urlInterceptor: HttpInterceptorFn = (request, next) => {
  // ✅ Lista de patrones que NO deben tener el prefijo de API
  const excludedPatterns = [
    '/assets/',      // Archivos estáticos
    '/i18n/',        // Archivos de traducción
    '.json',         // Archivos JSON en general
    'http://',       // URLs absolutas HTTP
    'https://',      // URLs absolutas HTTPS
  ];

  // ✅ Verificar si la URL debe ser excluida
  const shouldExclude = excludedPatterns.some(pattern => 
    request.url.includes(pattern)
  );

  // ✅ Si debe ser excluida, pasar la request sin modificar
  if (shouldExclude) {
    return next(request);
  }

  // ✅ Solo agregar baseUrl a URLs relativas de API
  const baseUrl: string = environment.baseUrl;
  const apiUrl = `${baseUrl}${request.url}`;
  const req = request.clone({ url: apiUrl });
  
  return next(req);
}