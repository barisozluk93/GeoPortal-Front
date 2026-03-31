import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpErrorResponse,
  HttpEvent
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { AuthModel } from '../modules/auth/models/auth.model';
import { Router } from '@angular/router';
import {
  Observable,
  BehaviorSubject,
  catchError,
  filter,
  switchMap,
  take,
  throwError
} from 'rxjs';
import { ResultModel } from '../models/result.model';
import { AuthHTTPService } from '../modules/auth/services/auth-http';

@Injectable({ providedIn: 'root' })
export class Interceptor implements HttpInterceptor {
  private authLocalStorageToken = `${environment.appVersion}-${environment.USERDATA_KEY}`;

  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  constructor(
    private router: Router,
    private authHttpService: AuthHTTPService
  ) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Refresh endpoint ise intercept etme
    if (request.url.includes('/auth/RefreshToken')) {
      return next.handle(request);
    }

    const user = this.getUserFromLocalStorage();

    let authRequest = request;

    if (user?.accessToken) {
      authRequest = this.addToken(request, user.accessToken);
    }

    return next.handle(authRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          return this.handle401Error(request, next, error);
        }

        if (error.status === 403) {
          this.router.navigate(['/error/500']);
        }

        return throwError(() => error);
      })
    );
  }

  private handle401Error(
    request: HttpRequest<any>,
    next: HttpHandler,
    originalError: HttpErrorResponse
  ): Observable<HttpEvent<any>> {
    const user = this.getUserFromLocalStorage();

    if (!user?.refreshToken || !user?.accessToken) {
      this.logout();
      return throwError(() => originalError);
    }

    // Eğer refresh işlemi zaten başladıysa, yeni token gelene kadar bekle
    if (this.isRefreshing) {
      return this.refreshTokenSubject.pipe(
        filter((token): token is string => token !== null),
        take(1),
        switchMap((token: string) => {
          const retryRequest = this.addToken(request, token);
          return next.handle(retryRequest);
        })
      );
    }

    // İlk 401 refresh işlemini başlatır
    this.isRefreshing = true;
    this.refreshTokenSubject.next(null);

    return this.authHttpService.refreshToken(user.accessToken, user.refreshToken).pipe(
      switchMap((response: ResultModel<any>) => {
        this.isRefreshing = false;

        if (response?.isSuccess && response.data?.accessToken && response.data?.refreshToken) {
          const updatedUser = {
            ...user,
            accessToken: response.data.accessToken,
            refreshToken: response.data.refreshToken
          };

          localStorage.setItem(this.authLocalStorageToken, JSON.stringify(updatedUser));

          this.refreshTokenSubject.next(updatedUser.accessToken);

          const retryRequest = this.addToken(request, updatedUser.accessToken);
          return next.handle(retryRequest);
        }

        this.refreshTokenSubject.next(null);
        this.logout();
        return throwError(() => originalError);
      }),
      catchError((refreshError) => {
        this.isRefreshing = false;
        this.refreshTokenSubject.next(null);
        this.logout();
        return throwError(() => refreshError);
      })
    );
  }

  private addToken(request: HttpRequest<any>, token: string): HttpRequest<any> {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  private getUserFromLocalStorage(): AuthModel | null {
    const currentUser = localStorage.getItem(this.authLocalStorageToken);
    return currentUser ? JSON.parse(currentUser) : null;
  }

  private logout(): void {
    localStorage.removeItem(this.authLocalStorageToken);
    this.isRefreshing = false;
    this.refreshTokenSubject.next(null);
    this.router.navigate(['/landing/marketplace']);
  }
}