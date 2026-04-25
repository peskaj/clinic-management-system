import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface User {
  id: number;
  username: string;
  roles: number[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly currentUser = signal<User | null | undefined>(undefined);

  constructor(private http: HttpClient) {
    this.refresh();
  }

  refresh() {
    this.http.get<User | null>('/api/auth').subscribe({
      next: (user) => this.currentUser.set(user),
      error: () => this.currentUser.set(null),
    });
  }

  login(username: string, password: string) {
    return this.http.post<User>('/api/auth', { username, password });
  }

  logout() {
    return this.http.delete<{ message: string }>('/api/auth');
  }
}
