import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap, catchError, of } from 'rxjs';

export interface User {
  id: number;
  username: string;
  roles: number[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly currentUser = signal<User | null | undefined>(undefined);

  constructor(private http: HttpClient) {}

  refresh() {
    return this.http.get<User | null>('/api/auth').pipe(
      tap(user => this.currentUser.set(user)),
      catchError(() => { this.currentUser.set(null); return of(null); }),
    );
  }

  login(username: string, password: string) {
    return this.http.post<User>('/api/auth', { username, password });
  }

  logout() {
    return this.http.delete<{ message: string }>('/api/auth');
  }
}
