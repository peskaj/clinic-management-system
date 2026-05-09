import { Component, inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './settings.html',
  styleUrl: './settings.css'
})
export class Settings {
  protected auth = inject(AuthService);
}
