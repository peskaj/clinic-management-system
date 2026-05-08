import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MaterialModule } from './material/material-module';
import { AuthPanel } from './auth/auth-panel';
import { AuthService } from './auth/auth.service';
import { routes } from './app.routes';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, MaterialModule, AuthPanel],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private auth = inject(AuthService);

  protected navItems = computed(() => {
    const user = this.auth.currentUser();
    return routes.filter(route => {
      const roles: number[] | null = route.data?.['roles'] ?? null;
      if (roles === null) return true;
      if (!user) return false;
      return roles.some(r => user.roles.includes(r));
    });
  });
}
