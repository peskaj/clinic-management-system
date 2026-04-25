import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialModule } from '../material/material-module';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-auth-panel',
  imports: [MaterialModule, ReactiveFormsModule],
  templateUrl: './auth-panel.html',
  styleUrl: './auth-panel.css',
})
export class AuthPanel {
  protected auth = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  protected form = new FormGroup({
    username: new FormControl('', [Validators.required]),
    password: new FormControl('', [Validators.required]),
  });

  protected loading = false;

  protected login() {
    if (this.form.invalid) return;
    this.loading = true;
    const { username, password } = this.form.value;
    this.auth.login(username!, password!).subscribe({
      next: (user) => {
        this.auth.currentUser.set(user);
        this.loading = false;
      },
      error: (err) => {
        this.snackBar.open(err.error?.message ?? 'Błąd logowania', 'OK', { duration: 3000 });
        this.loading = false;
      },
    });
  }

  protected logout() {
    this.loading = true;
    this.auth.logout().subscribe({
      next: () => {
        this.auth.currentUser.set(null);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }
}
