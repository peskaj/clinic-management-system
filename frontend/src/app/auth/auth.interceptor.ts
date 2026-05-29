import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Tutaj w przyszłości obsłużymy tokeny, na razie zostawiamy pusty
  return next(req);
};