import { Component, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MaterialModule } from './material/material-module';
import { AuthPanel } from './auth/auth-panel';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, MaterialModule, AuthPanel],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('frontend');
}
